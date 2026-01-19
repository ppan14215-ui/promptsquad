# Migration Order

**IMPORTANT: Run migrations in this exact order!**

## Required Migration Sequence

1. **001_initial_schema.sql** - Creates all tables including `mascots`, `profiles`, `conversations`, `messages`, etc.
2. **002_add_preferred_llm.sql** - Adds `preferred_llm` column to profiles
3. **003_add_admin_skills.sql** - Adds admin role and skills management
4. **004_add_mascot_likes.sql** - Creates `mascot_likes` table and functions
5. **005_add_skill_questions.sql** - Adds `skill_questions` JSONB column to `mascot_skills`
6. **006_add_admin_mascot_update.sql** - Adds RLS policies for admin to update mascots
7. **007_ensure_all_mascot_images.sql** - Ensures all 15 mascot images have database entries

## Quick Start

If you're starting fresh, run all migrations in order (001 through 007).

If you already have some migrations applied, check which ones are missing and run only those.

## Verify Migrations

To check if the `mascots` table exists:
```sql
SELECT COUNT(*) FROM public.mascots;
```

To see all mascots:
```sql
SELECT id, name, image_url, sort_order, is_active, is_free 
FROM public.mascots 
ORDER BY sort_order;
```

You should see 15 mascots after running migration 007.
