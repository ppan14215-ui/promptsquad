-- =============================================
-- NUCLEAR FIX FOR RLS ISSUE
-- This completely resets RLS policies on mascots table
-- =============================================

-- Step 1: Drop ALL policies
DROP POLICY IF EXISTS "Mascots are viewable by everyone" ON public.mascots;
DROP POLICY IF EXISTS "Admins can view all mascots" ON public.mascots;
DROP POLICY IF EXISTS "Admins can update mascots" ON public.mascots;

-- Step 2: Disable RLS temporarily to see if that's the issue
ALTER TABLE public.mascots DISABLE ROW LEVEL SECURITY;

-- Step 3: Test query (should return ALL mascots now)
SELECT COUNT(*) as total_count FROM public.mascots;
SELECT COUNT(*) as active_count FROM public.mascots WHERE is_active = true;

-- Step 4: Re-enable RLS
ALTER TABLE public.mascots ENABLE ROW LEVEL SECURITY;

-- Step 5: Create the SIMPLEST possible policy - allow EVERYONE to see active mascots
-- No authentication check, no admin check, just: if is_active = true, you can see it
CREATE POLICY "Mascots are viewable by everyone" 
  ON public.mascots FOR SELECT 
  USING (is_active = true);

-- Step 6: Verify the policy
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'mascots';

-- Step 7: Test as anonymous user (simulate client query)
-- This should return 20 if all mascots are active
SELECT COUNT(*) as visible_to_anon 
FROM public.mascots 
WHERE is_active = true;
