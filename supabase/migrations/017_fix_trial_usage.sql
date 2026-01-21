-- Migration 017: Fix Trial Usage and increment_trial_usage RPC
-- This fixes the "ambiguous column reference" error and ensures trial usage works correctly.

-- 1. Create trial_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.trial_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mascot_id VARCHAR(10) NOT NULL REFERENCES public.mascots(id) ON DELETE CASCADE,
    conversation_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, mascot_id)
);

-- 2. Enable RLS
ALTER TABLE public.trial_usage ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Users can view own trial usage" ON public.trial_usage;
CREATE POLICY "Users can view own trial usage" 
    ON public.trial_usage FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

-- 4. Fix increment_trial_usage RPC
-- Using p_ prefix for parameters and trial_usage. prefix for columns to avoid ambiguity
CREATE OR REPLACE FUNCTION public.increment_trial_usage(p_mascot_id VARCHAR)
RETURNS TABLE (conversation_count INTEGER, limit_reached BOOLEAN) AS $$
DECLARE
    v_user_id UUID;
    v_new_count INTEGER;
    v_limit INTEGER := 5;
BEGIN
    v_user_id := auth.uid();
    
    -- Insert or update trial usage
    INSERT INTO public.trial_usage (user_id, mascot_id, conversation_count, last_used_at)
    VALUES (v_user_id, p_mascot_id, 1, NOW())
    ON CONFLICT (user_id, mascot_id)
    DO UPDATE SET 
        conversation_count = public.trial_usage.conversation_count + 1,
        last_used_at = NOW()
    RETURNING public.trial_usage.conversation_count INTO v_new_count;
    
    RETURN QUERY SELECT v_new_count, v_new_count >= v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
