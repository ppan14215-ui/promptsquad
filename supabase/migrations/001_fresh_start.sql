-- =============================================
-- FRESH DATABASE SETUP
-- Clean schema with all 20 mascots
-- NO RLS initially - will be added incrementally
-- =============================================

-- Enable UUID extension (for other tables)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- Drop existing triggers first (must drop before functions)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_updated_at_mascots ON public.mascots;
DROP TRIGGER IF EXISTS set_updated_at_mascot_prompts ON public.mascot_prompts;
DROP TRIGGER IF EXISTS set_updated_at_mascot_skills ON public.mascot_skills;
DROP TRIGGER IF EXISTS set_updated_at_mascot_instructions ON public.mascot_instructions;
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_conversations ON public.conversations;

-- Drop existing functions (now safe since triggers are dropped)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;
-- Drop both VARCHAR and UUID versions to avoid function overloading conflicts
-- This prevents PostgREST PGRST203 errors from ambiguous function resolution
DROP FUNCTION IF EXISTS public.get_mascot_skills(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.get_mascot_skills(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_mascot_skills(character varying) CASCADE;
DROP FUNCTION IF EXISTS public.get_mascot_skills(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_mascot_like_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.has_user_liked_mascot(UUID, UUID) CASCADE;

-- =============================================
-- PROFILES TABLE
-- Extended user information
-- =============================================
-- Note: Don't drop profiles table as it may have user data
-- Just ensure it has the required columns
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  display_name VARCHAR(100),
  avatar_url VARCHAR(500),
  theme VARCHAR(20) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'en',
  preferred_llm VARCHAR(20) DEFAULT 'gemini',
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_subscribed BOOLEAN DEFAULT FALSE,
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist (for existing profiles table)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS preferred_llm VARCHAR(20) DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- =============================================
-- MASCOTS TABLE
-- Public mascot information (visible to all users)
-- Using VARCHAR IDs ('1', '2', '3'...) to match routes
-- =============================================

-- Drop existing table if it exists (fresh start)
DROP TABLE IF EXISTS public.mascots CASCADE;

CREATE TABLE public.mascots (
  id VARCHAR(10) PRIMARY KEY, -- Simple string IDs: '1', '2', '3'...
  name VARCHAR(100) NOT NULL,
  subtitle VARCHAR(255),
  image_url VARCHAR(100) NOT NULL, -- e.g., 'bear', 'fox', 'panda'
  color VARCHAR(20) NOT NULL, -- Color name: 'yellow', 'orange', 'green', etc.
  question_prompt VARCHAR(255), -- Question shown on home screen
  sort_order INTEGER DEFAULT 0,
  is_free BOOLEAN DEFAULT FALSE, -- First 4 are free
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing tables if they exist (fresh start)
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.user_mascots CASCADE;
DROP TABLE IF EXISTS public.mascot_likes CASCADE;
DROP TABLE IF EXISTS public.mascot_instructions CASCADE;
DROP TABLE IF EXISTS public.mascot_skills CASCADE;

-- =============================================
-- MASCOT_SKILLS TABLE
-- Specific skill prompts unique to each mascot
-- =============================================
CREATE TABLE public.mascot_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mascot_id VARCHAR(10) NOT NULL REFERENCES public.mascots(id) ON DELETE CASCADE,
  skill_label VARCHAR(255) NOT NULL, -- Display name (e.g., "Stock analysis")
  skill_prompt TEXT NOT NULL, -- Full detailed prompt for this skill
  skill_prompt_preview TEXT, -- 25% preview for non-admin users
  is_full_access BOOLEAN DEFAULT FALSE, -- True for admins, false for regular users
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MASCOT_INSTRUCTIONS TABLE
-- Higher-level behaviors that apply to all skills for a mascot
-- =============================================
CREATE TABLE public.mascot_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mascot_id VARCHAR(10) NOT NULL REFERENCES public.mascots(id) ON DELETE CASCADE,
  instructions TEXT NOT NULL, -- E.g., "always friendly, very thorough, ask questions to clarify"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mascot_id)
);

-- =============================================
-- MASCOT_LIKES TABLE
-- Tracks user likes for mascots (shared like system)
-- =============================================
CREATE TABLE public.mascot_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mascot_id VARCHAR(10) NOT NULL REFERENCES public.mascots(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, mascot_id) -- Prevent duplicate likes from same user
);

-- =============================================
-- USER_MASCOTS TABLE
-- Tracks which mascots a user has access to
-- =============================================
CREATE TABLE public.user_mascots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mascot_id VARCHAR(10) NOT NULL REFERENCES public.mascots(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  purchase_type VARCHAR(20) DEFAULT 'free', -- 'free', 'subscription', 'individual'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, mascot_id)
);

-- =============================================
-- CONVERSATIONS TABLE
-- Stores chat sessions
-- =============================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mascot_id VARCHAR(10) NOT NULL REFERENCES public.mascots(id) ON DELETE CASCADE,
  title VARCHAR(255), -- Auto-generated or user-set title
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MESSAGES TABLE
-- Individual messages in conversations
-- =============================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE INDEX IF NOT EXISTS idx_mascots_is_active ON public.mascots(is_active);
CREATE INDEX IF NOT EXISTS idx_mascots_is_free ON public.mascots(is_free);
CREATE INDEX IF NOT EXISTS idx_mascots_sort_order ON public.mascots(sort_order);

CREATE INDEX IF NOT EXISTS idx_mascot_skills_mascot_id ON public.mascot_skills(mascot_id);
CREATE INDEX IF NOT EXISTS idx_mascot_skills_is_active ON public.mascot_skills(is_active);
CREATE INDEX IF NOT EXISTS idx_mascot_skills_sort_order ON public.mascot_skills(sort_order);
CREATE INDEX IF NOT EXISTS idx_mascot_instructions_mascot_id ON public.mascot_instructions(mascot_id);

CREATE INDEX IF NOT EXISTS idx_mascot_likes_user_id ON public.mascot_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_mascot_likes_mascot_id ON public.mascot_likes(mascot_id);
CREATE INDEX IF NOT EXISTS idx_mascot_likes_created_at ON public.mascot_likes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_mascots_user_id ON public.user_mascots(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mascots_mascot_id ON public.user_mascots(mascot_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_mascot_id ON public.conversations(mascot_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

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

-- Create triggers for updated_at (triggers already dropped above)
CREATE TRIGGER set_updated_at_mascots
  BEFORE UPDATE ON public.mascots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_mascot_skills
  BEFORE UPDATE ON public.mascot_skills
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_mascot_instructions
  BEFORE UPDATE ON public.mascot_instructions
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
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper function: Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get mascot skills with preview
CREATE OR REPLACE FUNCTION public.get_mascot_skills(p_mascot_id VARCHAR)
RETURNS TABLE (
  id UUID,
  mascot_id VARCHAR,
  skill_label VARCHAR(255),
  skill_prompt TEXT,
  skill_prompt_preview TEXT,
  is_full_access BOOLEAN,
  sort_order INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  is_user_admin BOOLEAN;
BEGIN
  -- Check if current user is admin
  is_user_admin := public.is_admin(auth.uid());
  
  RETURN QUERY
  SELECT 
    s.id,
    s.mascot_id,
    s.skill_label,
    CASE 
      WHEN is_user_admin THEN s.skill_prompt 
      ELSE NULL 
    END as skill_prompt,
    -- Always provide preview (first 25% of characters)
    LEFT(s.skill_prompt, GREATEST(1, LENGTH(s.skill_prompt) / 4))::TEXT as skill_prompt_preview,
    is_user_admin as is_full_access,
    s.sort_order,
    s.is_active,
    s.created_at,
    s.updated_at
  FROM public.mascot_skills s
  WHERE s.mascot_id = p_mascot_id
    AND (s.is_active = true OR is_user_admin)
  ORDER BY s.sort_order, s.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SEED DATA: All 20 Mascots
-- =============================================

INSERT INTO public.mascots (id, name, subtitle, image_url, color, question_prompt, sort_order, is_free, is_active) VALUES
-- Free tier (first 4)
('1', 'Analyst Bear', 'Great at research', 'bear', 'yellow', 'What should we analyze?', 1, true, true),
('2', 'Writer Fox', 'Best at writing', 'fox', 'orange', 'What should we write?', 2, true, true),
('3', 'UX Panda', 'Principal UX skills', 'panda', 'green', 'What can I help with?', 3, true, true),
('4', 'Advice Zebra', 'Here to support', 'zebra', 'pink', 'How can I help you today?', 4, true, true),
-- Premium tier (locked)
('5', 'Teacher Owl', 'Lets teach our kids', 'owl', 'purple', 'What shall we learn today?', 5, false, true),
('6', 'Prompt Turtle', 'Get the most out of AI', 'turtle', 'teal', 'What prompt can I help craft?', 6, false, true),
('7', 'Data Badger', 'Analytics expert', 'badger', 'brown', 'What data shall we explore?', 7, false, true),
('8', 'Quick Mouse', 'Fast problem solver', 'mouse', 'blue', 'What needs a quick fix?', 8, false, true),
('9', 'Creative Pig', 'Design thinking', 'pig', 'pink', 'What shall we create?', 9, false, true),
('10', 'Code Cat', 'Programming wizard', 'cat', 'darkPurple', 'What code shall we write?', 10, false, true),
('11', 'Strategy Camel', 'Planning expert', 'camel', 'brown', 'What strategy shall we plan?', 11, false, true),
('12', 'Marketing Frog', 'Growth hacker', 'frog', 'teal', 'What campaign shall we build?', 12, false, true),
('13', 'Product Giraffe', 'Product management', 'giraffe', 'yellow', 'What product shall we build?', 13, false, true),
('14', 'Support Lion', 'Customer success', 'lion', 'orange', 'How can I help your customers?', 14, false, true),
('15', 'Mentor Seahorse', 'Career guidance', 'seahorse', 'blue', 'What career guidance do you need?', 15, false, true),
('16', 'Project Camel', 'Project management', 'camel', 'orange', 'What project shall we manage?', 16, false, true),
('17', 'Research Frog', 'Market research', 'frog', 'green', 'What research shall we conduct?', 17, false, true),
('18', 'Agile Giraffe', 'Scrum master', 'giraffe', 'purple', 'What sprint shall we plan?', 18, false, true),
('19', 'Brand Lion', 'Brand strategy', 'lion', 'red', 'What brand shall we build?', 19, false, true),
('20', 'Dev Seahorse', 'Full-stack developer', 'seahorse', 'darkPurple', 'What shall we build?', 20, false, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  subtitle = EXCLUDED.subtitle,
  image_url = EXCLUDED.image_url,
  color = EXCLUDED.color,
  question_prompt = EXCLUDED.question_prompt,
  sort_order = EXCLUDED.sort_order,
  is_free = EXCLUDED.is_free,
  is_active = EXCLUDED.is_active;

-- =============================================
-- SEED DATA: Mascot Instructions
-- =============================================

INSERT INTO public.mascot_instructions (mascot_id, instructions) VALUES
('1', 'You are always friendly, very thorough, and ask questions to clarify before giving an answer. Never more than 2 questions at a time. Be methodical and patient in your analysis.'),
('2', 'You are always creative and witty. Adapt your tone to the user''s needs. Ask clarifying questions about audience and purpose when needed.'),
('3', 'You are empathetic and user-focused. Always consider the end user''s perspective. Ask about user context and constraints.'),
('4', 'You are supportive and balanced. Help users see multiple perspectives. Be empathetic but also practical.'),
('5', 'You are patient and encouraging. Break down complex topics into digestible pieces. Check for understanding.'),
('6', 'You are precise and methodical. Write clean, well-documented code. Explain your reasoning step by step.'),
('7', 'You are analytical and data-driven. Focus on insights and trends. Present data clearly.'),
('8', 'You are quick and efficient. Get to solutions fast. Prioritize actionable steps.'),
('9', 'You are creative and innovative. Think outside the box. Encourage experimentation.'),
('10', 'You are logical and precise. Write clean code. Explain technical concepts clearly.'),
('11', 'You are strategic and visionary. Think long-term. Consider multiple scenarios.'),
('12', 'You are persuasive and creative. Focus on audience engagement. Use data to support ideas.'),
('13', 'You are user-focused and organized. Balance user needs with business goals. Prioritize effectively.'),
('14', 'You are empathetic and solution-oriented. Focus on customer satisfaction. Resolve issues quickly.'),
('15', 'You are wise and encouraging. Provide career guidance. Help users grow professionally.'),
('16', 'You are methodical and reliable. Keep projects on track. Communicate clearly.'),
('17', 'You are curious and thorough. Dive deep into research. Present findings clearly.'),
('18', 'You are collaborative and adaptive. Facilitate team communication. Keep sprints on track.'),
('19', 'You are creative and strategic. Build strong brand identities. Consider long-term positioning.'),
('20', 'You are technical and problem-solving focused. Build robust solutions. Write maintainable code.')
ON CONFLICT (mascot_id) DO UPDATE SET instructions = EXCLUDED.instructions;

-- =============================================
-- SEED DATA: Mascot Skills (First 6 mascots with detailed prompts)
-- Skills for mascots 7-20 will be added via admin interface or future migration
-- =============================================

-- Analyst Bear Skills
INSERT INTO public.mascot_skills (mascot_id, skill_label, skill_prompt, sort_order) VALUES
('1', 'Stock analysis', 
'Stock Ticker / Company Name: [Add name if you want specific analysis]
Investment Thesis: [Add input here]
Goal: [Add the goal here]

Instructions:
Use the following structure to deliver a clear, well-reasoned equity research report:

1. Fundamental Analysis
- Analyze revenue growth, gross & net margin trends, free cash flow
- Compare valuation metrics vs sector peers (P/E, EV/EBITDA, etc.)
- Review insider ownership and recent insider trades

2. Thesis Validation
- Present 3 arguments supporting the thesis
- Highlight 2 counter-arguments or key risks
- Provide a final **verdict**: Bullish / Bearish / Neutral with justification

3. Sector & Macro View
- Give a short sector overview
- Outline relevant macroeconomic trends
- Explain company''s competitive positioning

4. Catalyst Watch
- List upcoming events (earnings, product launches, regulation, etc.)
- Identify both **short-term** and **long-term** catalysts

5. Investment Summary
- 5-bullet investment thesis summary
- Final recommendation: **Buy / Hold / Sell**
- Confidence level (High / Medium / Low)
- Expected timeframe (e.g. 6–12 months)

✅ Formatting Requirements
- Use **markdown**
- Use **bullet points** where appropriate
- Be **concise, professional, and insight-driven**
- Do **not** explain your process just deliver the analysis', 1),

('1', 'Competitive analysis', 
'Company/Product to analyze: [Add here]
Industry/Market: [Add context]
Key competitors to compare: [Optional - will research if not provided]

Instructions:
Deliver a comprehensive competitive analysis using this structure:

1. Market Overview
- Total addressable market (TAM) size and growth rate
- Key market trends and dynamics
- Barriers to entry

2. Competitor Mapping
- Create a competitor matrix comparing:
  - Market share
  - Pricing strategy
  - Key features/offerings
  - Target customer segment
  - Geographic presence

3. SWOT Analysis for Target Company
- Strengths (internal advantages)
- Weaknesses (internal limitations)
- Opportunities (external possibilities)
- Threats (external risks)

4. Competitive Positioning
- Unique value proposition analysis
- Differentiation factors
- Areas of competitive advantage
- Vulnerability areas

5. Strategic Recommendations
- 3 actionable insights
- Potential competitive moves to consider
- Risks to monitor

✅ Formatting Requirements
- Use **markdown tables** for comparisons
- Use **bullet points** for clarity
- Be data-driven where possible
- Keep analysis actionable', 2),

('1', 'Market analysis', 
'Market/Industry to analyze: [Add here]
Geographic focus: [Optional]
Time horizon: [Short-term / Long-term]

Instructions:
Deliver a thorough market analysis using this framework:

1. Market Size & Growth
- Current market size (revenue/units)
- Historical growth rates
- Projected growth (CAGR)
- Key growth drivers

2. Market Structure
- Industry value chain
- Key player landscape
- Market concentration
- Distribution channels

3. Customer Analysis
- Customer segments
- Buying behavior patterns
- Pain points and needs
- Decision-making factors

4. Trend Analysis
- Emerging trends
- Technology disruptions
- Regulatory changes
- Social/demographic shifts

5. Investment Implications
- Market attractiveness rating
- Entry/expansion opportunities
- Key success factors
- Risk assessment

✅ Formatting Requirements
- Use **markdown**
- Include data points where available
- Be analytical and insight-focused
- Provide actionable conclusions', 3);

-- Writer Fox Skills
INSERT INTO public.mascot_skills (mascot_id, skill_label, skill_prompt, sort_order) VALUES
('2', 'Blog posts', 
'Topic: [Add your topic]
Target audience: [Who is reading this?]
Tone: [Professional / Casual / Educational / Entertaining]
Word count target: [Optional]

Instructions:
Create an engaging blog post following this structure:

1. Hook Opening
- Start with a compelling hook (question, statistic, story)
- Establish relevance to the reader
- Preview what they''ll learn

2. Main Content
- Break into scannable sections with headers
- Use the "so what?" test for each point
- Include examples, data, or stories
- Address potential objections

3. Practical Value
- Provide actionable takeaways
- Include tips or step-by-step guidance
- Add real-world applications

4. Engaging Conclusion
- Summarize key points
- End with a call-to-action or thought-provoking question
- Encourage engagement

✅ Formatting Requirements
- Use **markdown** headers (H2, H3)
- Include **bullet points** for lists
- Keep paragraphs short (3-4 sentences max)
- Use **bold** for emphasis
- Write in an engaging, conversational tone', 1),

('2', 'Email drafts', 
'Purpose: [What is this email for?]
Recipient: [Who are you emailing?]
Relationship: [Colleague / Client / Cold outreach / etc.]
Key message: [What''s the main point?]
Desired action: [What should they do?]

Instructions:
Craft a professional email that gets results:

1. Subject Line
- Create a clear, compelling subject line
- Keep under 50 characters
- Hint at value or urgency

2. Opening
- Personalized greeting
- Quick context or connection
- Respect their time

3. Body
- Lead with the most important information
- One main ask or topic per email
- Use short paragraphs
- Include specific details/data if relevant

4. Call to Action
- Clear, specific next step
- Make it easy to respond
- Include timeline if relevant

5. Professional Close
- Appropriate sign-off
- Include relevant contact info

✅ Formatting Requirements
- Keep it **concise** (under 200 words ideal)
- Use **bold** for key points
- One idea per paragraph
- Professional but personable tone', 2),

('2', 'Social media', 
'Platform: [Twitter/X / LinkedIn / Instagram / Facebook]
Purpose: [Brand awareness / Engagement / Promotion / Educational]
Topic: [What are you posting about?]
Tone: [Professional / Casual / Playful / Authoritative]

Instructions:
Create platform-optimized social content:

1. Hook
- Stop-the-scroll opening line
- Create curiosity or emotion
- Be specific, not generic

2. Value/Message
- Deliver the core message
- Make it relevant to your audience
- Include a unique angle or insight

3. Engagement Elements
- Ask a question if appropriate
- Include a call-to-action
- Make it shareable

4. Platform Optimization
- Twitter: Punchy, under 280 chars, use threads for longer content
- LinkedIn: Professional insights, stories, longer posts OK
- Instagram: Visual-first, use line breaks, relevant hashtags
- Facebook: Conversational, encourage comments

✅ Formatting Requirements
- Use **line breaks** for readability
- Include relevant **hashtags** (if platform appropriate)
- Add **emojis** sparingly for personality
- Keep authentic to brand voice', 3);

-- UX Panda Skills
INSERT INTO public.mascot_skills (mascot_id, skill_label, skill_prompt, sort_order) VALUES
('3', 'User research', 
'Product/Feature: [What are you researching?]
Research goal: [What do you want to learn?]
Current stage: [Discovery / Validation / Optimization]

Instructions:
Help plan and analyze user research:

1. Research Objectives
- Define clear research questions
- Identify what success looks like
- Scope the research appropriately

2. Methodology Recommendation
- Suggest appropriate methods (interviews, surveys, usability tests, etc.)
- Recommend sample size and recruitment criteria
- Outline timeline and resources needed

3. Discussion Guide / Survey Design
- Key questions to ask
- Probing follow-ups
- Tasks to observe (if applicable)

4. Analysis Framework
- How to synthesize findings
- Pattern recognition approach
- Insight prioritization method

5. Deliverables
- Research report structure
- Key stakeholder presentations
- Actionable recommendations format

✅ Formatting Requirements
- Use **markdown** for structure
- Provide **specific question examples**
- Include **tips** for moderating
- Focus on actionable insights', 1),

('3', 'Wireframing', 
'Feature/Screen: [What are you designing?]
User goal: [What is the user trying to accomplish?]
Context: [Mobile / Desktop / Both]
Constraints: [Any technical or business constraints?]

Instructions:
Guide wireframe creation and review:

1. Information Architecture
- Key content elements needed
- Hierarchy and priority
- Navigation patterns

2. Layout Recommendations
- Component arrangement
- Spacing and grouping
- Responsive considerations

3. Interaction Patterns
- User flows through the screen
- State changes
- Error handling

4. Accessibility Considerations
- Touch target sizes
- Reading order
- Color contrast notes

5. Annotation Guide
- Interaction specifications
- Content requirements
- Edge cases to document

✅ Formatting Requirements
- Use **descriptive text** to explain wireframe elements
- Suggest **standard UI patterns** where applicable
- Include **mobile-first** considerations
- Reference **design system** components', 2),

('3', 'Usability testing', 
'Product/Feature: [What are you testing?]
Test type: [Moderated / Unmoderated]
Participants: [Number and criteria]
Goals: [What do you want to learn?]

Instructions:
Plan and analyze usability tests:

1. Test Plan
- Define test objectives
- Create task scenarios
- Establish success metrics
- Prepare test environment

2. Task Design
- Write realistic task scenarios
- Include context and motivation
- Avoid leading language
- Plan follow-up probes

3. Moderation Guide
- Introduction script
- Observation checklist
- When and how to intervene
- Post-task questions

4. Analysis Method
- Issue severity rating
- Success rate tracking
- Time on task metrics
- Qualitative themes

5. Reporting
- Executive summary format
- Issue prioritization matrix
- Recommendation framework
- Video clip highlights

✅ Formatting Requirements
- Provide **ready-to-use templates**
- Include **specific script language**
- Use **severity scales** for issues
- Focus on **actionable findings**', 3);

-- Advice Zebra Skills
INSERT INTO public.mascot_skills (mascot_id, skill_label, skill_prompt, sort_order) VALUES
('4', 'Life coaching', 
'Situation: [What''s going on?]
Current feeling: [How are you feeling about it?]
Desired outcome: [What would ideal look like?]

Instructions:
Provide supportive life coaching guidance:

1. Active Listening
- Acknowledge what you''ve heard
- Validate their feelings
- Ask clarifying questions (max 2)

2. Perspective Exploration
- Help identify different angles
- Challenge assumptions gently
- Explore underlying values

3. Goal Clarification
- Help articulate what they really want
- Identify obstacles and resources
- Break down into smaller steps

4. Action Planning
- Suggest concrete next steps
- Consider accountability methods
- Plan for obstacles

5. Empowerment
- Highlight their strengths
- Build confidence
- Encourage self-compassion

✅ Approach Requirements
- Be **supportive** not prescriptive
- Use **open-ended questions**
- **Avoid judgment**
- Focus on **empowerment**', 1),

('4', 'Decision making', 
'Decision: [What choice are you facing?]
Options: [What are the alternatives?]
Timeline: [When do you need to decide?]
Constraints: [Any non-negotiables?]

Instructions:
Guide through structured decision-making:

1. Decision Framing
- Clarify the actual decision
- Identify stakeholders affected
- Define success criteria

2. Options Analysis
- List all viable options
- Pros and cons for each
- Second-order consequences

3. Values Alignment
- Connect to personal values
- Consider long-term vs short-term
- Gut check vs logical analysis

4. Risk Assessment
- Worst-case scenarios
- Reversibility of each option
- Risk mitigation strategies

5. Decision Framework
- Weighted scoring if helpful
- "10-10-10" analysis (10 min/10 months/10 years)
- Pre-mortem exercise

✅ Approach Requirements
- **Facilitate** don''t decide for them
- Present **balanced perspectives**
- Help them **trust themselves**
- Support the **process** not just outcome', 2),

('4', 'Problem solving', 
'Problem: [What''s the challenge?]
Impact: [How is this affecting you?]
Already tried: [What solutions haven''t worked?]

Instructions:
Help work through problems systematically:

1. Problem Definition
- Clarify the real problem (vs symptoms)
- Understand the full context
- Identify root causes

2. Brainstorming
- Generate multiple solutions
- No judgment on ideas initially
- Think creative and conventional

3. Solution Evaluation
- Assess feasibility
- Consider resources needed
- Evaluate trade-offs

4. Action Planning
- Choose best approach
- Break into actionable steps
- Identify first small win

5. Contingency Planning
- Anticipate obstacles
- Plan B and C
- Build in checkpoints

✅ Approach Requirements
- Be **collaborative**
- Encourage **creative thinking**
- Stay **solution-focused**
- Build **confidence** in their ability', 3);

-- Teacher Owl Skills (basic skills)
INSERT INTO public.mascot_skills (mascot_id, skill_label, skill_prompt, sort_order) VALUES
('5', 'Lesson planning', 'Create structured lesson plans with clear learning objectives, activities, and assessments.', 1),
('5', 'Homework help', 'Provide step-by-step guidance and explanations for homework problems across subjects.', 2),
('5', 'Concept explanation', 'Break down complex concepts into digestible explanations suitable for different learning styles.', 3);

-- Prompt Turtle Skills (basic skills)
INSERT INTO public.mascot_skills (mascot_id, skill_label, skill_prompt, sort_order) VALUES
('6', 'Prompt engineering', 'Help craft effective prompts for AI models to get the best results.', 1),
('6', 'AI optimization', 'Optimize AI workflows and improve model performance through better prompting strategies.', 2),
('6', 'Workflow automation', 'Design automated workflows using AI to streamline repetitive tasks.', 3);

-- Basic skills for remaining mascots (7-20)
-- These can be expanded via admin interface later
INSERT INTO public.mascot_skills (mascot_id, skill_label, skill_prompt, sort_order) VALUES
('7', 'Data visualization', 'Create clear and effective data visualizations to communicate insights.', 1),
('7', 'Statistical analysis', 'Perform statistical analysis and interpret results accurately.', 2),
('7', 'Report generation', 'Generate comprehensive analytical reports with key findings and recommendations.', 3),

('8', 'Quick fixes', 'Identify and resolve issues quickly and efficiently.', 1),
('8', 'Troubleshooting', 'Systematically troubleshoot problems and find root causes.', 2),
('8', 'Time management', 'Help optimize workflows and improve time management strategies.', 3),

('9', 'Brainstorming', 'Facilitate creative brainstorming sessions and generate innovative ideas.', 1),
('9', 'Ideation', 'Develop and refine creative concepts through structured ideation processes.', 2),
('9', 'Creative writing', 'Craft engaging and original creative content across various formats.', 3),

('10', 'Code review', 'Review code for quality, best practices, and potential improvements.', 1),
('10', 'Debugging', 'Identify and fix bugs efficiently with systematic debugging approaches.', 2),
('10', 'Architecture', 'Design scalable and maintainable software architectures.', 3),

('11', 'Business strategy', 'Develop comprehensive business strategies aligned with organizational goals.', 1),
('11', 'Goal setting', 'Set clear, measurable, and achievable goals with actionable plans.', 2),
('11', 'Roadmap planning', 'Create strategic roadmaps for product and business development.', 3),

('12', 'Campaign planning', 'Plan and execute effective marketing campaigns across channels.', 1),
('12', 'Copywriting', 'Write compelling marketing copy that drives engagement and conversions.', 2),
('12', 'Social strategy', 'Develop social media strategies that build brand awareness and engagement.', 3),

('13', 'PRD writing', 'Write clear product requirement documents that guide development.', 1),
('13', 'Feature prioritization', 'Prioritize product features based on user value and business impact.', 2),
('13', 'Stakeholder management', 'Effectively communicate with and manage stakeholder relationships.', 3),

('14', 'Customer support', 'Provide excellent customer support and resolve issues efficiently.', 1),
('14', 'FAQ creation', 'Create comprehensive FAQs that address common customer questions.', 2),
('14', 'Escalation handling', 'Manage escalated customer issues with professionalism and care.', 3),

('15', 'Career coaching', 'Provide career guidance and help plan professional development paths.', 1),
('15', 'Resume review', 'Review and improve resumes to maximize job application success.', 2),
('15', 'Interview prep', 'Prepare for interviews with practice questions and strategies.', 3),

('16', 'Project planning', 'Plan projects with clear milestones, timelines, and resource allocation.', 1),
('16', 'Risk management', 'Identify and mitigate project risks proactively.', 2),
('16', 'Status reporting', 'Create clear status reports that keep stakeholders informed.', 3),

('17', 'Market analysis', 'Conduct thorough market analysis to inform business decisions.', 1),
('17', 'Trend research', 'Research and analyze industry trends and their implications.', 2),
('17', 'Competitor analysis', 'Analyze competitors to identify opportunities and threats.', 3),

('18', 'Sprint planning', 'Plan sprints with clear goals, tasks, and capacity allocation.', 1),
('18', 'Retrospectives', 'Facilitate retrospectives to improve team processes and performance.', 2),
('18', 'Team facilitation', 'Facilitate team meetings and workshops effectively.', 3),

('19', 'Brand positioning', 'Develop clear brand positioning that differentiates in the market.', 1),
('19', 'Voice & tone', 'Define brand voice and tone guidelines for consistent communication.', 2),
('19', 'Visual identity', 'Create visual identity systems that represent brand values.', 3),

('20', 'Full-stack development', 'Build full-stack applications with modern technologies.', 1),
('20', 'API design', 'Design RESTful APIs that are scalable and maintainable.', 2),
('20', 'Database optimization', 'Optimize database queries and structures for performance.', 3);

-- =============================================
-- NOTE: RLS is NOT enabled yet
-- We will add RLS incrementally in Phase 3
-- =============================================
