-- =============================================
-- SECURITY AUDIT PATCHES (RATE LIMITING)
-- =============================================

-- 1. Create table for tracking rate limits (short-term)
CREATE TABLE IF NOT EXISTS public.user_rate_limits (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    request_count INTEGER DEFAULT 0,
    window_start_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (though mainly accessed by service role)
ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (Edge Functions use service role)
-- No public access policies needed as users don't manage their own limits directly via client.

-- 2. Function to check and update rate limit atomically
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_max_requests INTEGER DEFAULT 10,
    p_window_seconds INTEGER DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
    v_window_start TIMESTAMPTZ;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Lock row for update to prevent race conditions
    SELECT request_count, window_start_at 
    INTO v_count, v_window_start
    FROM public.user_rate_limits
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- First time request
        INSERT INTO public.user_rate_limits (user_id, request_count, window_start_at)
        VALUES (p_user_id, 1, v_now);
        RETURN TRUE;
    END IF;

    -- Check if window has expired
    IF v_window_start + (p_window_seconds || ' seconds')::INTERVAL < v_now THEN
        -- Reset window
        UPDATE public.user_rate_limits
        SET request_count = 1,
            window_start_at = v_now
        WHERE user_id = p_user_id;
        RETURN TRUE;
    ELSE
        -- Within window, check limit
        IF v_count < p_max_requests THEN
            -- Increment
            UPDATE public.user_rate_limits
            SET request_count = request_count + 1
            WHERE user_id = p_user_id;
            RETURN TRUE;
        ELSE
            -- Limit exceeded
            RETURN FALSE;
        END IF;
    END IF;
END;
$$;

-- Grant execute to service role (and potentially authenticated if called via Rpc but edge function uses service role)
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO authenticated; -- Just in case called via client (though we use Edge Function mainly)
