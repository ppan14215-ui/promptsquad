-- =============================================
-- ADD SKILL QUESTIONS SUPPORT
-- =============================================

-- Add skill_questions JSONB column to mascot_skills table
-- Questions format:
-- {
--   "questions": [
--     {
--       "id": "question-1",
--       "type": "choice" | "text",
--       "label": "Question text",
--       "choices": ["Option 1", "Option 2", ...], // Only for type "choice" (max 6)
--       "required": true | false,
--       "placeholder": "Enter text..." // Only for type "text"
--     }
--   ]
-- }
ALTER TABLE public.mascot_skills 
ADD COLUMN IF NOT EXISTS skill_questions JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.mascot_skills.skill_questions IS 'JSONB array of questions to show before executing skill. Supports choice (multiple choice) and text (text input) types. Max 6 choices per question.';

-- Update get_mascot_skills function to include skill_questions
-- First drop the existing function since we're changing the return type
DROP FUNCTION IF EXISTS public.get_mascot_skills(UUID);

-- Now create the function with the new return type
CREATE FUNCTION public.get_mascot_skills(p_mascot_id UUID)
RETURNS TABLE (
  id UUID,
  mascot_id UUID,
  skill_label VARCHAR(255),
  skill_prompt TEXT,
  skill_prompt_preview TEXT,
  skill_questions JSONB,
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
    s.skill_questions, -- Include questions (available to all users)
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
