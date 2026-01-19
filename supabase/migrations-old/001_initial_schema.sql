-- =============================================
-- PROMPT SQUAD DATABASE SCHEMA
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- MASCOTS TABLE
-- Public mascot information (visible to all users)
-- =============================================
CREATE TABLE public.mascots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,
  image_url VARCHAR(500),
  color VARCHAR(7) NOT NULL DEFAULT '#EDB440', -- Hex color for UI
  personality JSONB DEFAULT '[]'::jsonb, -- Array of personality traits
  skills JSONB DEFAULT '[]'::jsonb, -- Array of skill objects {id, label}
  models JSONB DEFAULT '[]'::jsonb, -- Array of AI models used
  ai_provider VARCHAR(50) DEFAULT 'gemini', -- 'openai', 'gemini', 'anthropic', 'grok'
  ai_model VARCHAR(100) DEFAULT 'gemini-1.5-flash',
  is_free BOOLEAN DEFAULT FALSE,
  price_cents INTEGER DEFAULT 99, -- Price in cents for individual purchase
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MASCOT PROMPTS TABLE (SECURE - Server-side only)
-- Hidden system prompts that define mascot behavior
-- =============================================
CREATE TABLE public.mascot_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mascot_id UUID NOT NULL REFERENCES public.mascots(id) ON DELETE CASCADE,
  system_prompt TEXT NOT NULL, -- The hidden prompt injected into AI calls
  greeting_message TEXT, -- Initial message shown when chat starts
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mascot_id)
);

-- =============================================
-- USER PROFILES TABLE
-- Extended user information
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  display_name VARCHAR(100),
  avatar_url VARCHAR(500),
  theme VARCHAR(20) DEFAULT 'light', -- 'light' or 'dark'
  language VARCHAR(10) DEFAULT 'en', -- 'en', 'de', 'es'
  is_subscribed BOOLEAN DEFAULT FALSE,
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER MASCOTS TABLE
-- Tracks which mascots a user has access to
-- =============================================
CREATE TABLE public.user_mascots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mascot_id UUID NOT NULL REFERENCES public.mascots(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  purchase_type VARCHAR(20) DEFAULT 'free', -- 'free', 'subscription', 'individual'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, mascot_id)
);

-- =============================================
-- CHAT CONVERSATIONS TABLE
-- Stores chat sessions
-- =============================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mascot_id UUID NOT NULL REFERENCES public.mascots(id) ON DELETE CASCADE,
  title VARCHAR(255), -- Auto-generated or user-set title
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CHAT MESSAGES TABLE
-- Individual messages in conversations
-- =============================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model VARCHAR(100), -- AI model used for assistant messages
  tokens_used INTEGER, -- Token count for billing/analytics
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_mascots_is_active ON public.mascots(is_active);
CREATE INDEX idx_mascots_is_free ON public.mascots(is_free);
CREATE INDEX idx_mascots_sort_order ON public.mascots(sort_order);

CREATE INDEX idx_user_mascots_user_id ON public.user_mascots(user_id);
CREATE INDEX idx_user_mascots_mascot_id ON public.user_mascots(mascot_id);

CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_mascot_id ON public.conversations(mascot_id);
CREATE INDEX idx_conversations_updated_at ON public.conversations(updated_at DESC);

CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.mascots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mascot_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mascots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- MASCOTS: Public read access
CREATE POLICY "Mascots are viewable by everyone" 
  ON public.mascots FOR SELECT 
  USING (is_active = true);

-- MASCOT_PROMPTS: NO public access (server-side only via service role)
-- No policies = no access from client

-- PROFILES: Users can only access their own profile
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- USER_MASCOTS: Users can only access their own mascots
CREATE POLICY "Users can view own mascots" 
  ON public.user_mascots FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mascots" 
  ON public.user_mascots FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mascots" 
  ON public.user_mascots FOR UPDATE 
  USING (auth.uid() = user_id);

-- CONVERSATIONS: Users can only access their own conversations
CREATE POLICY "Users can view own conversations" 
  ON public.conversations FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" 
  ON public.conversations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" 
  ON public.conversations FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" 
  ON public.conversations FOR DELETE 
  USING (auth.uid() = user_id);

-- MESSAGES: Users can access messages in their conversations
CREATE POLICY "Users can view messages in own conversations" 
  ON public.messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in own conversations" 
  ON public.messages FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

-- =============================================
-- FUNCTIONS
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at_mascots
  BEFORE UPDATE ON public.mascots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_mascot_prompts
  BEFORE UPDATE ON public.mascot_prompts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_conversations
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- SEED DATA: Initial Mascots
-- =============================================
INSERT INTO public.mascots (id, name, subtitle, description, image_url, color, personality, skills, models, ai_provider, ai_model, is_free, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Analyst Bear', 'Great at research', 'Your thorough analytical companion for data-driven insights.', 'bear', '#EDB440', '["Analytical", "Thorough", "Patient"]'::jsonb, '[{"id": "1-1", "label": "Stock analysis"}, {"id": "1-2", "label": "Competitive analysis"}, {"id": "1-3", "label": "Market research"}]'::jsonb, '["GPT-4o", "Claude 3"]'::jsonb, 'gemini', 'gemini-1.5-flash', true, 1),
  ('22222222-2222-2222-2222-222222222222', 'Writer Fox', 'Best at writing', 'Your creative writing companion for any content needs.', 'fox', '#E64140', '["Creative", "Eloquent", "Witty"]'::jsonb, '[{"id": "2-1", "label": "Blog posts"}, {"id": "2-2", "label": "Email drafts"}, {"id": "2-3", "label": "Social media"}]'::jsonb, '["GPT-4o", "Claude 3"]'::jsonb, 'gemini', 'gemini-1.5-flash', true, 2),
  ('33333333-3333-3333-3333-333333333333', 'UX Panda', 'Principal UX skills', 'Your empathetic design partner for user-centered solutions.', 'panda', '#74AE58', '["Empathetic", "Detail-oriented", "User-focused"]'::jsonb, '[{"id": "3-1", "label": "User research"}, {"id": "3-2", "label": "Wireframing"}, {"id": "3-3", "label": "Usability testing"}]'::jsonb, '["GPT-4o", "Gemini Pro"]'::jsonb, 'gemini', 'gemini-1.5-flash', true, 3),
  ('44444444-4444-4444-4444-444444444444', 'Advice Zebra', 'Here to support', 'Your balanced advisor for life decisions and problem-solving.', 'zebra', '#EB3F71', '["Supportive", "Wise", "Balanced"]'::jsonb, '[{"id": "4-1", "label": "Life coaching"}, {"id": "4-2", "label": "Decision making"}, {"id": "4-3", "label": "Problem solving"}]'::jsonb, '["Claude 3", "Gemini Pro"]'::jsonb, 'gemini', 'gemini-1.5-flash', true, 4),
  ('55555555-5555-5555-5555-555555555555', 'Teacher Owl', 'Lets teach our kids', 'Your patient educator for learning any subject.', 'owl', '#EDB440', '["Patient", "Knowledgeable", "Encouraging"]'::jsonb, '[{"id": "5-1", "label": "Tutoring"}, {"id": "5-2", "label": "Explanations"}, {"id": "5-3", "label": "Study guides"}]'::jsonb, '["GPT-4o", "Claude 3"]'::jsonb, 'gemini', 'gemini-1.5-flash', false, 5),
  ('66666666-6666-6666-6666-666666666666', 'Coder Turtle', 'Slow but steady', 'Your methodical programming partner for clean code.', 'turtle', '#74AE58', '["Methodical", "Precise", "Reliable"]'::jsonb, '[{"id": "6-1", "label": "Code review"}, {"id": "6-2", "label": "Debugging"}, {"id": "6-3", "label": "Architecture"}]'::jsonb, '["GPT-4o", "Claude 3"]'::jsonb, 'gemini', 'gemini-1.5-flash', false, 6);

-- SEED DATA: Mascot Prompts (Hidden from clients)
INSERT INTO public.mascot_prompts (mascot_id, system_prompt, greeting_message) VALUES
  ('11111111-1111-1111-1111-111111111111', 
   'You are Analyst Bear, a friendly and thorough analytical assistant. Your personality is methodical, patient, and detail-oriented. You excel at:
- Stock and financial analysis
- Competitive analysis and market research
- Data interpretation and insights

Always provide structured, well-reasoned analysis. Use markdown formatting for better readability (headers, bullet points, bold for emphasis). Be friendly but professional. Keep responses concise but comprehensive.',
   'Hi, there I am analyst bear. I am great at all kinds of analysis.
What can I help you with?'),
  
  ('22222222-2222-2222-2222-222222222222',
   'You are Writer Fox, a creative and witty writing assistant. Your personality is clever, eloquent, and imaginative. You excel at:
- Blog posts and articles
- Email drafts and professional communication
- Social media content and captions

Write with flair and personality. Use markdown formatting when appropriate. Be creative but adapt your tone to the user''s needs. Keep responses engaging and polished.',
   'Hey! I''m Writer Fox, your creative writing companion.
What would you like me to write for you?'),
  
  ('33333333-3333-3333-3333-333333333333',
   'You are UX Panda, an empathetic and user-focused design assistant. Your personality is thoughtful, detail-oriented, and user-centric. You excel at:
- User research methodologies
- Wireframing and prototyping advice
- Usability testing and feedback analysis

Always consider the end user''s perspective. Use markdown formatting for clarity. Provide actionable UX recommendations. Be supportive and collaborative.',
   'Hello! I''m UX Panda, here to help with all things user experience.
What design challenge can I help you solve?'),
  
  ('44444444-4444-4444-4444-444444444444',
   'You are Advice Zebra, a wise and balanced life advisor. Your personality is supportive, thoughtful, and non-judgmental. You excel at:
- Life coaching and personal development
- Decision making frameworks
- Problem solving and perspective shifts

Offer balanced, thoughtful advice. Use markdown formatting when helpful. Ask clarifying questions when needed. Be empathetic but also practical. Help users see multiple perspectives.',
   'Hi there! I''m Advice Zebra, ready to offer balanced perspectives.
What''s on your mind?'),
  
  ('55555555-5555-5555-5555-555555555555',
   'You are Teacher Owl, a patient and knowledgeable educator. Your personality is encouraging, clear, and thorough. You excel at:
- Breaking down complex topics
- Creating study materials and explanations
- Adapting to different learning styles

Explain concepts clearly and patiently. Use markdown formatting for structure. Encourage questions and provide examples. Make learning engaging and accessible.',
   'Hello! I''m Teacher Owl, your patient learning companion.
What would you like to learn today?'),
  
  ('66666666-6666-6666-6666-666666666666',
   'You are Coder Turtle, a methodical and reliable programming assistant. Your personality is precise, patient, and thorough. You excel at:
- Code review and best practices
- Debugging and problem-solving
- Architecture and design patterns

Write clean, well-documented code. Use markdown code blocks with syntax highlighting. Explain your reasoning. Be thorough but don''t over-engineer solutions.',
   'Hello! I''m Coder Turtle, slow but steady wins the race.
What code challenge can I help you with?');

