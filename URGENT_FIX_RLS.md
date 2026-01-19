# URGENT: Fix RLS Policy - This Will Fix Both Issues

## The Problem
Your console shows `[useMascots] All mascots (no filter): 6` - this means even WITHOUT the filter, only 6 mascots are returned. This is an **RLS (Row Level Security) policy issue**.

The RLS policy is blocking mascots 7-20 from being visible to your client-side app, even though they exist in the database.

## The Solution
I've created migration `010_fix_mascot_rls_policy.sql` that:
1. Drops the problematic policies
2. Creates a simple, permissive policy that allows ANYONE to see active mascots
3. Fixes the admin policy to work correctly

## ⚠️ **DO THIS NOW:**

### Step 1: Run the Migration
1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy the **ENTIRE** contents of:
   `/supabase/migrations/010_fix_mascot_rls_policy.sql`
3. Paste and **Run** it

### Step 2: Verify It Worked
After running, you should see at the bottom:
```
visible_mascots: 20
```

### Step 3: Test in Your App
1. **Clear your browser cache** (important!)
2. **Hard refresh** the app (Cmd+Shift+R or Ctrl+Shift+R)
3. Go to **Store** page
4. Check console - you should now see:
   ```
   [useMascots] All mascots (no filter): 20
   [useMascots] Fetched 20 active mascots from database
   [Store] Loaded 20 mascots
   ```
5. **All 20 mascots should appear in the store!**
6. Try liking any mascot (including Research Frog) - it should work!

## Why This Happens
The original RLS policy used `public.is_admin(auth.uid())` which:
- May not exist as a function
- May fail for anonymous/unauthenticated users
- May cause RLS to block rows when the function fails

The new policy is simpler and doesn't depend on functions that might fail.

## If It Still Doesn't Work
1. Check if you're logged in as an admin - if so, log out and test as anonymous user
2. Verify the migration ran successfully (check for errors)
3. Make sure you hard-refreshed the browser (clearing cache)

This should fix both issues at once! 🎯
