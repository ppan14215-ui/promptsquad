# Quick Database Check

Run this SQL in your Supabase SQL Editor to verify the mascots:

## Check total mascot count
```sql
SELECT COUNT(*) as total_mascots FROM mascots;
```
Expected: 20

## List all mascots with their UUIDs
```sql
SELECT 
  id, 
  name, 
  subtitle, 
  sort_order, 
  is_free,
  image_url
FROM mascots 
ORDER BY sort_order;
```

## Check specific mascots that were missing
```sql
-- Check Research Frog (the one you couldn't like)
SELECT * FROM mascots WHERE name = 'Research Frog';

-- Check Data Badger
SELECT * FROM mascots WHERE name = 'Data Badger';

-- Check Quick Mouse
SELECT * FROM mascots WHERE name = 'Quick Mouse';
```

## If you only have 6 mascots
You need to apply migration `008_seed_all_20_mascots.sql`:

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/008_seed_all_20_mascots.sql`
3. Run it

## Verify skills table works
```sql
-- Check that skills table exists and can relate to mascots
SELECT COUNT(*) FROM mascot_skills;
```
