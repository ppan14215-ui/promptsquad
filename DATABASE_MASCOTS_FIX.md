# Database Migration: Add All 20 Mascots

## Problem
The database only had 6 mascots seeded (from the initial schema), but the app expects 20 mascots. This caused issues with:
- Liking mascots beyond the first 6
- Editing skills for mascots 7-20
- The UUID mapping not matching database records

## Solution
Created migration `008_seed_all_20_mascots.sql` to add the missing 14 mascots.

## How to Apply

### For Local Development
```bash
# If using Supabase CLI locally
supabase db reset  # This will reset and reapply all migrations

# OR manually apply just this migration
supabase db push
```

### For Remote/Production Database
```bash
# Push the new migration to your remote Supabase project
supabase db push --linked

# OR apply manually via Supabase Dashboard:
# 1. Go to SQL Editor in your Supabase Dashboard
# 2. Copy the contents of supabase/migrations/008_seed_all_20_mascots.sql
# 3. Run it
```

### Manual Verification
After applying the migration, verify in Supabase Dashboard:

```sql
-- Check that all 20 mascots exist
SELECT id, name, subtitle, sort_order, is_free 
FROM mascots 
ORDER BY sort_order;

-- Should return 20 rows
SELECT COUNT(*) as total_mascots FROM mascots;
```

## What This Fixes
1. ✅ All 20 mascots are now in the database with proper UUIDs
2. ✅ Like system works for all mascots (uses database UUIDs)
3. ✅ Skills editor works for all mascots (uses database UUIDs)
4. ✅ Store screen fetches mascots from database
5. ✅ Skills page can edit any mascot's skills

## Mascots Added (7-20)
- Data Badger (77777777...)
- Quick Mouse (88888888...)
- Creative Pig (99999999...)
- Code Cat (10101010...)
- Strategy Camel (11111111...112)
- Marketing Frog (12121212...)
- Product Giraffe (13131313...)
- Support Lion (14141414...)
- Mentor Seahorse (15151515...)
- Project Camel (16161616...)
- Research Frog (17171717...) ← This is the one you couldn't like!
- Agile Giraffe (18181818...)
- Brand Lion (19191919...)
- Dev Seahorse (20202020...)
