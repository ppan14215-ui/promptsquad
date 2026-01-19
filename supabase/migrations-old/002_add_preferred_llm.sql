-- Add preferred_llm column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_llm VARCHAR(20) DEFAULT 'gemini';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.preferred_llm IS 'User preferred LLM provider: gemini or openai';

