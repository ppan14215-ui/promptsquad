-- Admin-editable short summary for skill cards (distinct from auto 25% prompt preview)
ALTER TABLE public.mascot_skills
  ADD COLUMN IF NOT EXISTS skill_summary TEXT;

COMMENT ON COLUMN public.mascot_skills.skill_summary IS
  'Short user-facing summary for skill cards (admin). Mirrored to skill_prompt_preview on save for legacy clients.';

-- Recreate public view so merged mascots / list queries expose skill_summary
DROP VIEW IF EXISTS public.public_mascot_skills;

CREATE OR REPLACE VIEW public.public_mascot_skills WITH (security_invoker = true) AS
SELECT
    ms.id,
    ms.mascot_id,
    ms.skill_label,
    CASE
        WHEN m.is_free = true THEN ms.skill_prompt
        WHEN m.owner_id = auth.uid() THEN ms.skill_prompt
        ELSE NULL::text
    END AS skill_prompt,
    ms.skill_prompt_preview,
    ms.skill_summary,
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
