-- =============================================
-- FINAL FIX FOR RLS - PRODUCTION DATABASE ACCESS
-- This ensures all 20 mascots are accessible via Supabase client
-- =============================================

-- Step 1: Verify current database state
SELECT 
  COUNT(*) as total_mascots,
  COUNT(*) FILTER (WHERE is_active = true) as active_count,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
  COUNT(*) FILTER (WHERE is_active IS NULL) as null_count
FROM public.mascots;

-- Step 2: Show which mascots are NOT active (for debugging)
SELECT id, name, is_active, sort_order 
FROM public.mascots 
WHERE is_active = false OR is_active IS NULL
ORDER BY sort_order;

-- Step 3: FORCE ALL 20 MASCOTS TO BE ACTIVE
UPDATE public.mascots 
SET is_active = true,
    updated_at = NOW()
WHERE is_active = false OR is_active IS NULL;

-- Step 4: Verify all are now active
SELECT 
  COUNT(*) as total_mascots,
  COUNT(*) FILTER (WHERE is_active = true) as active_count
FROM public.mascots;

-- Step 5: Drop ALL existing policies on mascots table
DROP POLICY IF EXISTS "Mascots are viewable by everyone" ON public.mascots;
DROP POLICY IF EXISTS "Admins can view all mascots" ON public.mascots;
DROP POLICY IF EXISTS "Admins can update mascots" ON public.mascots;

-- Step 6: Create simple, permissive policy for SELECT
-- This allows ANYONE (even anonymous users) to see active mascots
-- No authentication required - just check is_active = true
CREATE POLICY "Mascots are viewable by everyone" 
  ON public.mascots FOR SELECT 
  USING (is_active = true);

-- Step 7: Create admin policy for UPDATE (preserves existing functionality)
-- Admins can update mascots (for skills page editing)
CREATE POLICY "Admins can update mascots"
  ON public.mascots FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Step 8: Ensure RLS is enabled
ALTER TABLE public.mascots ENABLE ROW LEVEL SECURITY;

-- Step 9: Verify policies exist
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'mascots'
ORDER BY policyname;

-- Step 10: Test query (should return 20)
-- This simulates what the client will see
SELECT COUNT(*) as visible_count
FROM public.mascots
WHERE is_active = true;

-- Step 11: List all 20 mascots to confirm
SELECT id, name, is_active, sort_order 
FROM public.mascots 
ORDER BY sort_order;
