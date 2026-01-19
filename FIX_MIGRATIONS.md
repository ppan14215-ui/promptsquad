# Fix Database Migrations

You're seeing two errors because the database migrations haven't been applied yet:

## Issue 1: Missing `mascot_likes` Table

**Error:** `Could not find the table 'public.mascot_likes' in the schema cache`

**Fix:** Run migration `004_add_mascot_likes.sql`

## Issue 2: Skill Questions Not Showing

The questionnaire modal requires:
1. Migration `005_add_skill_questions.sql` to be run
2. Questions to be added to the skill in the database

## How to Apply Migrations

### Option A: Supabase Dashboard (Recommended)

1. **Go to your Supabase project dashboard**
2. **Navigate to SQL Editor**
3. **Run these migrations in order:**

   **Step 1:** Copy and paste the entire contents of:
   ```
   supabase/migrations/004_add_mascot_likes.sql
   ```
   Click "Run" (or press Cmd/Ctrl + Enter)

   **Step 2:** Copy and paste the entire contents of:
   ```
   supabase/migrations/005_add_skill_questions.sql
   ```
   Click "Run"

### Option B: Using Supabase CLI (if installed)

```bash
# Navigate to your project
cd "/Users/ziegljia/Documents/Private/Vibecode/Prompt Squad 3"

# Push migrations to your database
supabase db push
```

## After Running Migrations

### 1. Verify Tables Exist

Run this in Supabase SQL Editor to check:

```sql
-- Check if mascot_likes table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('mascot_likes', 'mascot_skills');
```

You should see both tables listed.

### 2. Add Questions to Stock Analysis Skill

To make the questionnaire appear for "Stock analysis", run this SQL:

```sql
-- Add questions to "Stock analysis" skill
UPDATE public.mascot_skills
SET skill_questions = '{
  "questions": [
    {
      "id": "storage-question",
      "type": "choice",
      "label": "Where should skills and skill prompts be stored?",
      "choices": [
        "Database (new tables for skills and skill_prompts)",
        "Code/config files (easier to version control)",
        "Hybrid (skills in DB, prompts in secure table)"
      ],
      "required": true
    },
    {
      "id": "prompt-type",
      "type": "choice",
      "label": "What are skill prompts exactly?",
      "choices": [
        "Additional prompts added to the system prompt when a skill is selected",
        "Prefix added to user messages when skill is clicked"
      ],
      "required": false
    },
    {
      "id": "additional-details",
      "type": "text",
      "label": "Add more optional details",
      "placeholder": "Enter any additional context or requirements...",
      "required": false
    }
  ]
}'::jsonb
WHERE skill_label = 'Stock analysis' 
  AND mascot_id = '11111111-1111-1111-1111-111111111111';
```

**To find the correct skill**, first run:

```sql
SELECT id, skill_label, mascot_id 
FROM public.mascot_skills 
WHERE skill_label = 'Stock analysis';
```

Then use the correct `mascot_id` in the UPDATE query above.

### 3. Test Again

After running migrations:
1. **Refresh your browser/app**
2. **Click the heart icon** - should work now (if logged in)
3. **Click "Stock analysis" skill** - questionnaire modal should appear

## Debug Checklist

If questionnaire still doesn't show:

1. ✅ Check migrations ran successfully (no errors in SQL Editor)
2. ✅ Verify `skill_questions` column exists:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'mascot_skills' 
     AND column_name = 'skill_questions';
   ```
3. ✅ Check skill has questions:
   ```sql
   SELECT skill_label, skill_questions 
   FROM public.mascot_skills 
   WHERE skill_label = 'Stock analysis';
   ```
   Should show JSON with questions array.
4. ✅ Check browser console for logs when clicking skill
5. ✅ Verify `get_mascot_skills` RPC function includes `skill_questions`:
   ```sql
   SELECT proname, prosrc 
   FROM pg_proc 
   WHERE proname = 'get_mascot_skills';
   ```

## Quick Test Query

To add a simple test question:

```sql
UPDATE public.mascot_skills
SET skill_questions = '{"questions": [{"id": "test", "type": "choice", "label": "Test question?", "choices": ["Yes", "No"], "required": false}]}'::jsonb
WHERE skill_label = 'Stock analysis'
LIMIT 1;
```

Then click the skill - you should see a modal with one question.
