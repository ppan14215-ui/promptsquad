-- Expose full skill_prompt to mascot owners (custom mascots) so they see real prompts in Skills tab
-- View uses security_invoker so auth.uid() is the current user

DROP VIEW IF EXISTS public.public_mascot_skills;

CREATE OR REPLACE VIEW public.public_mascot_skills WITH (security_invoker = true) AS
SELECT
    ms.id,
    ms.mascot_id,
    ms.skill_label,
    -- Full prompt: free mascots (everyone) OR mascot owner (custom mascots)
    CASE
        WHEN m.is_free = true THEN ms.skill_prompt
        WHEN m.owner_id = auth.uid() THEN ms.skill_prompt
        ELSE NULL::text
    END AS skill_prompt,
    ms.skill_prompt_preview,
    -- Client still computes is_full_access; view leaves as false so client can override
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

GRANT SELECT ON public.public_mascot_skills TO authenticated, anon;
