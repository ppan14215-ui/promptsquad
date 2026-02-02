-- Add preferred_provider column to mascot_skills table
ALTER TABLE public.mascot_skills ADD COLUMN IF NOT EXISTS preferred_provider text;

-- Add comment
COMMENT ON COLUMN public.mascot_skills.preferred_provider IS 'The preferred AI provider (e.g., openai, grok) for this skill';
