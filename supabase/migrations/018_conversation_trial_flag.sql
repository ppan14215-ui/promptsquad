-- Migration 018: Add trial_counted to conversations and update RPC
-- This allows us to track which conversations have already been counted as trials.

-- 1. Add is_trial_counted column to conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS is_trial_counted BOOLEAN DEFAULT FALSE;

-- 2. Update increment_trial_usage RPC to handle specific conversation
CREATE OR REPLACE FUNCTION public.increment_trial_usage(
    p_mascot_id VARCHAR,
    p_conversation_id UUID DEFAULT NULL
)
RETURNS TABLE (conversation_count INTEGER, limit_reached BOOLEAN) AS $$
DECLARE
    v_user_id UUID;
    v_new_count INTEGER;
    v_limit INTEGER := 5;
    v_already_counted BOOLEAN := FALSE;
BEGIN
    v_user_id := auth.uid();
    
    -- 1. Check if this conversation was already counted
    IF p_conversation_id IS NOT NULL THEN
        SELECT is_trial_counted INTO v_already_counted
        FROM public.conversations
        WHERE id = p_conversation_id AND user_id = v_user_id;
    END IF;

    -- 2. If already counted, just return current usage count
    IF v_already_counted THEN
        SELECT COALESCE(tu.conversation_count, 0) INTO v_new_count
        FROM public.trial_usage tu
        WHERE tu.user_id = v_user_id AND tu.mascot_id = p_mascot_id;
        
        RETURN QUERY SELECT v_new_count, v_new_count >= v_limit;
        RETURN;
    END IF;

    -- 3. Mark conversation as counted (if ID provided)
    IF p_conversation_id IS NOT NULL THEN
        UPDATE public.conversations
        SET is_trial_counted = TRUE
        WHERE id = p_conversation_id AND user_id = v_user_id;
    END IF;

    -- 4. Increment trial usage count for this mascot
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
