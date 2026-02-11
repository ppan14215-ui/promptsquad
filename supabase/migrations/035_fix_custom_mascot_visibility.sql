-- Fix custom mascot visibility: ensure users can only see their own custom mascots
-- Problem: The old "Mascots are viewable by everyone" policy (from 015) 
-- allows ALL active mascots to be seen by anyone, overriding the owner_id restriction.
-- In PostgreSQL, RLS policies are OR'd: if ANY policy grants access, the row is visible.

-- 1. Drop the overly permissive legacy policies
DROP POLICY IF EXISTS "Mascots are viewable by everyone" ON public.mascots;
DROP POLICY IF EXISTS "Mascots are viewable by authenticated users" ON public.mascots;

-- 2. Ensure the owner_id-based policy is the ONLY select policy for regular users
-- This means:
--   - Public mascots (owner_id IS NULL): visible to all authenticated users
--   - Custom mascots (owner_id IS NOT NULL): only visible to the owner
DROP POLICY IF EXISTS "Enable read access for all users and owners" ON public.mascots;
CREATE POLICY "Enable read access for all users and owners" ON public.mascots
FOR SELECT USING (
  (owner_id IS NULL) OR (owner_id = auth.uid())
);

-- 3. Keep admin full access (already exists from 002_enable_rls.sql)
-- "Admins can manage mascots" policy already grants FOR ALL to admins.
-- BUT we need to make admin NOT see other users' custom mascots in normal views.
-- This is better handled in the frontend (admin filter in useMergedMascots)
-- since the admin needs DB-level access for management purposes.
