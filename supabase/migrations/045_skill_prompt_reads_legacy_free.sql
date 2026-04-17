-- Align DB "free tier" with app resolveMascotIsFree (ids 1–4 when is_free was NULL).
-- Add SECURITY DEFINER RPCs that return full mascot_skills rows so clients always get skill_prompt
-- even if PostgREST/RLS behaves unexpectedly for direct table reads.
-- Recreate public_mascot_skills view: expose skill_prompt for legacy numeric ids <= 4.

UPDATE public.mascots
SET
  is_free = true,
  updated_at = COALESCE(updated_at, now())
WHERE id IN ('1', '2', '3', '4')
  AND is_free IS NULL;

-- Ensure column exists on remotes that skipped 044 or pre-date it
ALTER TABLE public.mascot_skills
  ADD COLUMN IF NOT EXISTS skill_summary TEXT;

DROP FUNCTION IF EXISTS public.get_mascot_skills(text);

CREATE OR REPLACE FUNCTION public.get_mascot_skills(p_mascot_id text)
RETURNS TABLE (
  id text,
  mascot_id text,
  skill_label text,
  skill_prompt text,
  skill_prompt_preview text,
  skill_summary text,
  is_full_access boolean,
  sort_order int,
  is_active boolean,
  preferred_provider text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ms.id,
    ms.mascot_id,
    ms.skill_label,
    ms.skill_prompt,
    ms.skill_prompt_preview,
    ms.skill_summary,
    ms.is_full_access,
    ms.sort_order,
    ms.is_active,
    ms.preferred_provider,
    ms.created_at,
    ms.updated_at
  FROM public.mascot_skills ms
  WHERE ms.mascot_id = p_mascot_id
    AND ms.is_active = true
  ORDER BY ms.sort_order ASC NULLS LAST, ms.created_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_mascot_skills_by_ids(p_mascot_ids text[])
RETURNS TABLE (
  id text,
  mascot_id text,
  skill_label text,
  skill_prompt text,
  skill_prompt_preview text,
  skill_summary text,
  is_full_access boolean,
  sort_order int,
  is_active boolean,
  preferred_provider text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ms.id,
    ms.mascot_id,
    ms.skill_label,
    ms.skill_prompt,
    ms.skill_prompt_preview,
    ms.skill_summary,
    ms.is_full_access,
    ms.sort_order,
    ms.is_active,
    ms.preferred_provider,
    ms.created_at,
    ms.updated_at
  FROM public.mascot_skills ms
  WHERE p_mascot_ids IS NOT NULL
    AND cardinality(p_mascot_ids) > 0
    AND ms.mascot_id = ANY (p_mascot_ids)
    AND ms.is_active = true
  ORDER BY ms.mascot_id, ms.sort_order ASC NULLS LAST, ms.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_mascot_skills(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mascot_skills_by_ids(text[]) TO anon, authenticated;

DROP VIEW IF EXISTS public.public_mascot_skills;

CREATE OR REPLACE VIEW public.public_mascot_skills WITH (security_invoker = true) AS
SELECT
  ms.id,
  ms.mascot_id,
  ms.skill_label,
  CASE
    WHEN m.is_free = true THEN ms.skill_prompt
    WHEN m.id IN ('1', '2', '3', '4') THEN ms.skill_prompt
    WHEN m.owner_id IS NOT NULL AND m.owner_id = auth.uid() THEN ms.skill_prompt
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

NOTIFY pgrst, 'reload schema';
