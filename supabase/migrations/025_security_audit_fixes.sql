-- =============================================
-- SECURITY AUDIT FIXES & SKILL VIEW UPDATE
-- 1. Fix "Policy Exists RLS Disabled" on mascot_personality
-- 2. Fix "Security Definer View" on public_mascot_skills
-- 3. Update view to include 'preferred_provider' column
-- =============================================

-- 1. Enable RLS on mascot_personality table
ALTER TABLE IF EXISTS public.mascot_personality ENABLE ROW LEVEL SECURITY;

-- 2. & 3. Recreate the view with SECURITY INVOKER and new columns
DROP VIEW IF EXISTS public.public_mascot_skills;

CREATE OR REPLACE VIEW public.public_mascot_skills WITH (security_invoker = true) AS
SELECT
    ms.id,
    ms.mascot_id,
    ms.skill_label,
    NULL::text AS skill_prompt, -- Hide sensitive prompt
    ms.skill_prompt_preview,
    false AS is_full_access,
    ms.sort_order,
    ms.is_active,
    ms.preferred_provider, -- Ensure this column is exposed for model selection
    ms.created_at,
    ms.updated_at
FROM
    public.mascot_skills ms
WHERE
    ms.is_active = true;

-- Grant access to authenticated users and anon (if public access is intended)
GRANT SELECT ON public.public_mascot_skills TO authenticated, anon;

-- Log the change
DO $$
BEGIN
    RAISE NOTICE 'Updated public_mascot_skills view with preferred_provider and enabled RLS on mascot_personality';
END $$;
