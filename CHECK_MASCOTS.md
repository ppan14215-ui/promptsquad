# How to Check and Fix Missing Mascots

## Current Issue
You're only seeing 6 mascots instead of 15. This means migration `007_ensure_all_mascot_images.sql` hasn't been run successfully.

## Steps to Fix

### 1. Check Current Mascots in Database
Run this SQL in Supabase SQL Editor:
```sql
SELECT id, name, subtitle, image_url, sort_order, is_active, is_free 
FROM public.mascots 
ORDER BY sort_order;
```

You should see 15 mascots. If you only see 6, continue to step 2.

### 2. Run Migration 007
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of `supabase/migrations/007_ensure_all_mascot_images.sql`
3. Click "Run" (or press Cmd/Ctrl + Enter)
4. This will insert/update all 15 mascots

### 3. Verify Mascots Were Created
Run the SELECT query from step 1 again. You should now see all 15 mascots:
1. Analyst Bear
2. Writer Fox
3. UX Panda
4. Advice Zebra
5. Teacher Owl
6. Prompt Turtle
7. Data Badger
8. Quick Mouse
9. Creative Pig
10. Code Cat
11. Strategy Camel
12. Marketing Frog
13. Product Giraffe
14. Support Lion
15. Mentor Seahorse

### 4. Refresh Your App
After running the migration, refresh your browser/app. You should now see all mascots in:
- Home screen carousel
- Store page
- Admin page

## Troubleshooting

If migration 007 fails with "relation 'public.mascots' does not exist":
- You need to run `001_initial_schema.sql` first
- Run migrations in this order: 001, 002, 003, 004, 005, 006, 007

If you get permission errors:
- Make sure you're logged into Supabase as an admin/owner
- Check that RLS policies allow inserts (migration 001 should handle this)
