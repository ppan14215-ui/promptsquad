-- =============================================
-- ADMIN SKILLS MANAGEMENT MIGRATION
-- =============================================

-- =============================================
-- 1. ADD ROLE COLUMN TO PROFILES
-- =============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Set admin role for ppan14215 email
UPDATE public.profiles 
SET role = 'admin' 
WHERE email LIKE 'ppan14215%';

-- =============================================
-- 2. CREATE MASCOT_INSTRUCTIONS TABLE
-- Higher-level behaviors that apply to all skills for a mascot
-- =============================================
CREATE TABLE IF NOT EXISTS public.mascot_instructions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mascot_id UUID NOT NULL REFERENCES public.mascots(id) ON DELETE CASCADE,
  instructions TEXT NOT NULL, -- E.g., "always friendly, very thorough, ask questions to clarify"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mascot_id)
);

-- =============================================
-- 3. CREATE MASCOT_SKILLS TABLE
-- Specific skill prompts unique to each mascot
-- =============================================
CREATE TABLE IF NOT EXISTS public.mascot_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mascot_id UUID NOT NULL REFERENCES public.mascots(id) ON DELETE CASCADE,
  skill_label VARCHAR(255) NOT NULL, -- Display name (e.g., "Stock analysis")
  skill_prompt TEXT NOT NULL, -- Full detailed prompt for this skill
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_mascot_skills_mascot_id ON public.mascot_skills(mascot_id);
CREATE INDEX IF NOT EXISTS idx_mascot_skills_is_active ON public.mascot_skills(is_active);
CREATE INDEX IF NOT EXISTS idx_mascot_skills_sort_order ON public.mascot_skills(sort_order);
CREATE INDEX IF NOT EXISTS idx_mascot_instructions_mascot_id ON public.mascot_instructions(mascot_id);

-- =============================================
-- 5. TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE TRIGGER set_updated_at_mascot_instructions
  BEFORE UPDATE ON public.mascot_instructions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_mascot_skills
  BEFORE UPDATE ON public.mascot_skills
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 6. ENABLE RLS
-- =============================================
ALTER TABLE public.mascot_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mascot_skills ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. HELPER FUNCTION: Check if user is admin
-- =============================================
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. RLS POLICIES FOR MASCOT_INSTRUCTIONS
-- =============================================

-- Anyone can read instructions
CREATE POLICY "Anyone can read mascot instructions"
  ON public.mascot_instructions FOR SELECT
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert mascot instructions"
  ON public.mascot_instructions FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can update
CREATE POLICY "Admins can update mascot instructions"
  ON public.mascot_instructions FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Only admins can delete
CREATE POLICY "Admins can delete mascot instructions"
  ON public.mascot_instructions FOR DELETE
  USING (public.is_admin(auth.uid()));

-- =============================================
-- 9. RLS POLICIES FOR MASCOT_SKILLS
-- =============================================

-- Anyone can read skills (but skill_prompt will be limited via view/function)
CREATE POLICY "Anyone can read mascot skills"
  ON public.mascot_skills FOR SELECT
  USING (is_active = true);

-- Only admins can insert
CREATE POLICY "Admins can insert mascot skills"
  ON public.mascot_skills FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can update
CREATE POLICY "Admins can update mascot skills"
  ON public.mascot_skills FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Only admins can delete
CREATE POLICY "Admins can delete mascot skills"
  ON public.mascot_skills FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Admins can also read inactive skills
CREATE POLICY "Admins can read all mascot skills"
  ON public.mascot_skills FOR SELECT
  USING (public.is_admin(auth.uid()));

-- =============================================
-- 10. FUNCTION: Get skill with optional preview
-- Returns full prompt for admins, 25% preview for others
-- =============================================
CREATE OR REPLACE FUNCTION public.get_mascot_skills(p_mascot_id UUID)
RETURNS TABLE (
  id UUID,
  mascot_id UUID,
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
-- 11. SEED DATA: Mascot Instructions
-- =============================================
INSERT INTO public.mascot_instructions (mascot_id, instructions) VALUES
  ('11111111-1111-1111-1111-111111111111', 
   'You are always friendly, very thorough, and ask questions to clarify before giving an answer. Never more than 2 questions at a time. Be methodical and patient in your analysis.'),
  ('22222222-2222-2222-2222-222222222222', 
   'You are always creative and witty. Adapt your tone to the user''s needs. Ask clarifying questions about audience and purpose when needed.'),
  ('33333333-3333-3333-3333-333333333333', 
   'You are empathetic and user-focused. Always consider the end user''s perspective. Ask about user context and constraints.'),
  ('44444444-4444-4444-4444-444444444444', 
   'You are supportive and balanced. Help users see multiple perspectives. Be empathetic but also practical.'),
  ('55555555-5555-5555-5555-555555555555', 
   'You are patient and encouraging. Break down complex topics into digestible pieces. Check for understanding.'),
  ('66666666-6666-6666-6666-666666666666', 
   'You are precise and methodical. Write clean, well-documented code. Explain your reasoning step by step.')
ON CONFLICT (mascot_id) DO UPDATE SET instructions = EXCLUDED.instructions;

-- =============================================
-- 12. SEED DATA: Mascot Skills
-- =============================================

-- Analyst Bear Skills
INSERT INTO public.mascot_skills (mascot_id, skill_label, skill_prompt, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Stock analysis', 
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
  
  ('11111111-1111-1111-1111-111111111111', 'Competitive analysis', 
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
  
  ('11111111-1111-1111-1111-111111111111', 'Market analysis', 
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
  ('22222222-2222-2222-2222-222222222222', 'Blog posts', 
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
  
  ('22222222-2222-2222-2222-222222222222', 'Email drafts', 
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
  
  ('22222222-2222-2222-2222-222222222222', 'Social media', 
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
  ('33333333-3333-3333-3333-333333333333', 'User research', 
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
  
  ('33333333-3333-3333-3333-333333333333', 'Wireframing', 
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
  
  ('33333333-3333-3333-3333-333333333333', 'Usability testing', 
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
  ('44444444-4444-4444-4444-444444444444', 'Life coaching', 
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
  
  ('44444444-4444-4444-4444-444444444444', 'Decision making', 
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
  
  ('44444444-4444-4444-4444-444444444444', 'Problem solving', 
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

