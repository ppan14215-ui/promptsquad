-- =============================================
-- FIX: Expose skill_prompt for FREE mascots (for home screen hover only)
-- The client-side will determine where to show full vs preview
-- Database always returns full prompt for free mascots for flexibility
-- =============================================

-- Drop and recreate the view to include conditional prompt exposure
DROP VIEW IF EXISTS public.public_mascot_skills;

CREATE OR REPLACE VIEW public.public_mascot_skills WITH (security_invoker = true) AS
SELECT
    ms.id,
    ms.mascot_id,
    ms.skill_label,
    -- Expose full prompt for FREE mascots so home screen can show it
    -- Pro mascots: hide prompt (require subscription)
    CASE 
        WHEN m.is_free = true THEN ms.skill_prompt
        ELSE NULL::text
    END AS skill_prompt,
    ms.skill_prompt_preview,
    -- is_full_access should STILL be false for free users (used by Skills tab)
    -- The home screen will show full prompt regardless for free mascots
    false AS is_full_access,
    ms.sort_order,
    ms.is_active,
    ms.preferred_provider,
    ms.created_at,
    ms.updated_at
FROM
    public.mascot_skills ms
    JOIN public.mascots m ON ms.mascot_id = m.id
WHERE
    ms.is_active = true;

-- Grant access to authenticated users and anon
GRANT SELECT ON public.public_mascot_skills TO authenticated, anon;

-- Log the change
DO $$
BEGIN
    RAISE NOTICE 'Updated public_mascot_skills view: full prompt for FREE mascots, is_full_access=false for all (Skills tab shows preview)';
END $$;
