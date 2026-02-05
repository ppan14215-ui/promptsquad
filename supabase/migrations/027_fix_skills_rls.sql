-- =============================================
-- FIX SKILLS RLS
-- Comprehensive reset of policies for mascot_skills
-- =============================================

-- 1. Ensure RLS is enabled
ALTER TABLE public.mascot_skills ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL potential existing policies to clear conflicts
DROP POLICY IF EXISTS "Public Read Access" ON public.mascot_skills;
DROP POLICY IF EXISTS "Anyone can read mascot skills" ON public.mascot_skills;
DROP POLICY IF EXISTS "Admins can manage mascot skills" ON public.mascot_skills;
DROP POLICY IF EXISTS "Admins can read all mascot skills" ON public.mascot_skills;
DROP POLICY IF EXISTS "Admins have full access" ON public.mascot_skills;
DROP POLICY IF EXISTS "Admins Write Access" ON public.mascot_skills;

-- 3. Create the definitive PUBLIC READ policy
-- This allows anyone (auth or anon) to read active skills
CREATE POLICY "Public Read Access"
ON public.mascot_skills
FOR SELECT
TO public -- 'public' includes both 'authenticated' and 'anon'
USING (is_active = true);

-- 4. Create ADMIN FULL ACCESS policy
CREATE POLICY "Admins Full Access"
ON public.mascot_skills
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
)
WITH CHECK (
  public.is_admin(auth.uid())
);

-- 5. Re-assert Grants (Just to be absolutely sure)
GRANT SELECT ON public.mascot_skills TO anon, authenticated;
GRANT SELECT ON public.mascot_personality TO anon, authenticated;

-- Log the change
DO $$
BEGIN
    RAISE NOTICE 'Reset RLS policies on mascot_skills to ensure public read access';
END $$;
