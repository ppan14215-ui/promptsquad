# URGENT: Apply This Migration

## The Problem
You're seeing only 6 mascots in the store because:
1. Migration 008 used `ON CONFLICT DO NOTHING` 
2. This added mascots 7-20, but didn't update mascots 1-6
3. The first 6 mascots may have old/incorrect data or missing `is_active = true`

## The Solution
Run the new migration `009_upsert_all_20_mascots.sql` which:
- ✅ Updates ALL 20 mascots (including fixing 1-6)
- ✅ Uses UPSERT (`ON CONFLICT DO UPDATE`) to replace existing data
- ✅ Sets `is_active = true` for all mascots
- ✅ Ensures correct `sort_order`, `is_free`, colors, etc.

## How to Apply

### Method 1: Supabase Dashboard (Do This Now!)
1. Open https://supabase.com/dashboard
2. Go to your project → **SQL Editor**
3. **COPY THE ENTIRE CONTENTS** of:
   `/supabase/migrations/009_upsert_all_20_mascots.sql`
4. Paste into SQL Editor
5. Click **RUN**

### Method 2: Supabase CLI
```bash
cd "/Users/ziegljia/Documents/Private/Vibecode/Prompt Squad 3"
supabase db push
```

## Verify It Worked

After running the migration, check in SQL Editor:

```sql
-- Should return 20
SELECT COUNT(*) as total FROM mascots WHERE is_active = true;

-- Should show all 20 mascots in order
SELECT sort_order, name, is_free, is_active 
FROM mascots 
ORDER BY sort_order;
```

## Expected Result
```
sort_order | name                | is_free | is_active
-----------+--------------------+---------+-----------
         1 | Analyst Bear       | true    | true
         2 | Writer Fox         | true    | true
         3 | UX Panda           | true    | true
         4 | Advice Zebra       | true    | true
         5 | Teacher Owl        | false   | true
         6 | Prompt Turtle      | false   | true
         7 | Data Badger        | false   | true
         8 | Quick Mouse        | false   | true
         9 | Creative Pig       | false   | true
        10 | Code Cat           | false   | true
        11 | Strategy Camel     | false   | true
        12 | Marketing Frog     | false   | true
        13 | Product Giraffe    | false   | true
        14 | Support Lion       | false   | true
        15 | Mentor Seahorse    | false   | true
        16 | Project Camel      | false   | true
        17 | Research Frog      | false   | true
        18 | Agile Giraffe      | false   | true
        19 | Brand Lion         | false   | true
        20 | Dev Seahorse       | false   | true
```

## Then Refresh Your App
1. Reload the store page
2. You should see all 20 mascots
3. Try liking any mascot (including Research Frog)
4. Go to Skills page and edit any mascot

## Why This Fixes It
- Old migration: "Add new mascots if they don't exist" (kept old data for 1-6)
- New migration: "Replace/update ALL mascots with correct data" (UPSERT)
- Sets `is_active = true` for all 20
- App query filters by `is_active = true`, so now all 20 show up
