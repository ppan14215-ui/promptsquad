-- =============================================
-- ADD ADMIN UPDATE POLICY FOR MASCOTS
-- =============================================

-- Drop policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Admins can update mascots" ON public.mascots;
DROP POLICY IF EXISTS "Admins can view all mascots" ON public.mascots;

-- Allow admins to update mascots (name, subtitle, etc.)
CREATE POLICY "Admins can update mascots"
  ON public.mascots FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Also allow admins to see all mascots (including inactive ones)
-- This policy works alongside the existing "Mascots are viewable by everyone" policy
-- Since policies are combined with OR, admins will see all mascots
CREATE POLICY "Admins can view all mascots"
  ON public.mascots FOR SELECT
  USING (public.is_admin(auth.uid()));
