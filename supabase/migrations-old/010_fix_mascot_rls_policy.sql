-- =============================================
-- FIX RLS POLICY FOR MASCOTS
-- Issue: Client-side query only returns 6 mascots even though DB has 20
-- The RLS policy might be too restrictive or there's a conflict
-- =============================================

-- Drop ALL existing policies on mascots table to start fresh
DROP POLICY IF EXISTS "Mascots are viewable by everyone" ON public.mascots;
DROP POLICY IF EXISTS "Admins can view all mascots" ON public.mascots;
DROP POLICY IF EXISTS "Admins can update mascots" ON public.mascots;

-- Create a simple, permissive policy for SELECT
-- This allows ANYONE (authenticated or not) to see active mascots
CREATE POLICY "Mascots are viewable by everyone" 
  ON public.mascots FOR SELECT 
  USING (is_active = true);

-- Admins can see ALL mascots (including inactive ones)
-- This works alongside the public policy (policies are OR'd together)
CREATE POLICY "Admins can view all mascots"
  ON public.mascots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Recreate admin update policy
CREATE POLICY "Admins can update mascots"
  ON public.mascots FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Verify RLS is enabled
ALTER TABLE public.mascots ENABLE ROW LEVEL SECURITY;

-- Test query to verify all 20 are visible
-- This should return 20 when run as anonymous user
SELECT COUNT(*) as visible_mascots 
FROM public.mascots 
WHERE is_active = true;
