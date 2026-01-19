# Debug RLS Issue - Only 6 Mascots Visible

## Problem
- Database has 20 mascots (verified via SQL)
- Supabase client query returns only 6 mascots
- This happens even with NO filters (`SELECT * FROM mascots`)

## Root Cause
This is **definitely an RLS (Row Level Security) issue**. Even the raw query without filters returns only 6, which means RLS policies are blocking the other 14 mascots.

## Immediate Action Required

### 1. Verify Migration 010 Was Applied
Run this in your Supabase SQL Editor:

```sql
-- Check if migration 010 was applied
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'mascots'
ORDER BY policyname;
```

You should see these policies:
- "Mascots are viewable by everyone" (SELECT, USING: is_active = true)
- "Admins can view all mascots" (SELECT, for admins)
- "Admins can update mascots" (UPDATE, for admins)

### 2. Check Current RLS Status
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'mascots';

-- Should show: rowsecurity = true
```

### 3. Check Active Mascots Count
```sql
-- Count how many mascots have is_active = true
SELECT 
  COUNT(*) FILTER (WHERE is_active = true) as active_count,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
  COUNT(*) as total_count
FROM public.mascots;
```

### 4. Test RLS as Anonymous User
```sql
-- Simulate anonymous user query
SET ROLE anon;
SELECT COUNT(*) FROM public.mascots WHERE is_active = true;
RESET ROLE;
```

### 5. Verify All 20 Mascots Are Active
```sql
-- Check which mascots are NOT active
SELECT id, name, is_active, sort_order 
FROM public.mascots 
WHERE is_active = false OR is_active IS NULL
ORDER BY sort_order;
```

If any mascots have `is_active = false` or `NULL`, that's the problem! Run:

```sql
-- Ensure ALL 20 mascots are active
UPDATE public.mascots 
SET is_active = true 
WHERE is_active = false OR is_active IS NULL;
```

### 6. Drop and Recreate RLS Policies (Nuclear Option)
If the above doesn't work, run this:

```sql
-- Drop ALL policies
DROP POLICY IF EXISTS "Mascots are viewable by everyone" ON public.mascots;
DROP POLICY IF EXISTS "Admins can view all mascots" ON public.mascots;
DROP POLICY IF EXISTS "Admins can update mascots" ON public.mascots;

-- Disable RLS temporarily to test
ALTER TABLE public.mascots DISABLE ROW LEVEL SECURITY;

-- Test: This should return ALL mascots now
SELECT COUNT(*) FROM public.mascots;

-- Re-enable RLS
ALTER TABLE public.mascots ENABLE ROW LEVEL SECURITY;

-- Recreate simple, permissive policy
CREATE POLICY "Mascots are viewable by everyone" 
  ON public.mascots FOR SELECT 
  USING (is_active = true);

-- Test again
SELECT COUNT(*) FROM public.mascots WHERE is_active = true;
```

## Next Steps
1. **Run the SQL queries above** in order
2. **Share the results** - especially:
   - How many mascots have `is_active = true`?
   - What policies exist on the `mascots` table?
   - What does the anonymous user query return?
3. **Refresh your app** (Cmd+Shift+R) after running the SQL
4. **Check the new console logs** - you should now see "Step 1", "Step 2", "Step 3" logs with detailed info
