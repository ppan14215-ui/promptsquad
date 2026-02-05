-- =============================================
-- GRANT PERMISSIONS
-- Explicitly grant SELECT on underlying tables for security_invoker view
-- =============================================

-- Grant access to mascot_skills table
GRANT SELECT ON public.mascot_skills TO authenticated, anon;

-- Grant access to mascot_personality table
GRANT SELECT ON public.mascot_personality TO authenticated, anon;

-- Log the change
DO $$
BEGIN
    RAISE NOTICE 'Granted SELECT permissions on mascot_skills and mascot_personality to authenticated/anon';
END $$;
