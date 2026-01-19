# Debugging: Store Showing Only 6 Mascots & Like Not Working

## What I Added (Debugging)

I've added console logging to help diagnose the issue:

### 1. `useMascots` Hook
- Logs total mascots (before filter)
- Logs active mascots (after `is_active = true` filter)
- Shows each mascot's `is_active` status
- Warns if count < 20

### 2. Store Screen
- Logs how many mascots are loaded in the store component
- Shows the list of mascot IDs and names

### 3. MascotDetails Component
- Logs the mascot ID when details modal opens
- Shows what ID is being passed to the like system

### 4. Like System
- Logs when toggleLike is called
- Shows the original mascotId and converted mascotUUID
- Shows why liking fails (if it does)

## What to Check

### Step 1: Open Browser Console
1. Open your app in browser
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to Console tab
4. Clear the console

### Step 2: Navigate to Store Page
1. Click on "Store" tab
2. Look for these log messages:
   - `[useMascots] Starting to fetch mascots...`
   - `[useMascots] All mascots (no filter): X`
   - `[useMascots] Fetched X active mascots from database:`
   - `[Store] Loaded X mascots:`

### Step 3: Check What You See

**Expected:**
```
[useMascots] All mascots (no filter): 20
[useMascots] Fetched 20 active mascots from database: [...]
[Store] Loaded 20 mascots: [...]
```

**If you see only 6:**
- Check if the first log shows 20 or 6
- If first log shows 20 but second shows 6: Some mascots have `is_active = false`
- If first log shows 6: RLS policy might be blocking, or data wasn't inserted

### Step 4: Try to Like a Mascot
1. Click on any mascot card in store
2. Click the heart icon
3. Check console for:
   - `[MascotDetailsWithData] Rendering for mascot:`
   - `[useMascotLike] toggleLike called:`
   - `Cannot toggle: missing mascotUUID...`

### Step 5: Common Issues & Fixes

#### Issue 1: Only 6 Mascots in First Log
**Cause:** Migration didn't run or data wasn't inserted  
**Fix:** Run SQL: `SELECT COUNT(*) FROM mascots;` → Should be 20

#### Issue 2: 20 in First Log, But 6 Active
**Cause:** Some mascots have `is_active = false`  
**Fix:** Run SQL:
```sql
UPDATE mascots SET is_active = true WHERE is_active = false;
```

#### Issue 3: Like Shows "missing mascotUUID"
**Cause:** The mascot ID isn't being converted properly  
**Check:** Look at console log - what is the `mascotId` value?  
**Fix:** If it's a simple ID like '17', the mapping should work. If it's a UUID, it should pass through.

#### Issue 4: RLS Policy Blocking
**Cause:** Row Level Security might be filtering mascots  
**Check:** Run SQL as authenticated user vs anonymous  
**Fix:** Check RLS policies - should allow `SELECT` for everyone when `is_active = true`

## Next Steps

1. **Check the console logs** and share what you see
2. **Check the database directly:**
   ```sql
   SELECT id, name, is_active, sort_order 
   FROM mascots 
   ORDER BY sort_order;
   ```
3. **Verify all mascots are active:**
   ```sql
   SELECT COUNT(*) as total, 
          SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_count
   FROM mascots;
   ```
   Should show: `total: 20, active_count: 20`

Once you check the console, we can see exactly where the issue is!
