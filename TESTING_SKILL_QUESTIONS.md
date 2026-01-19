# Testing Skill Questions Feature

## Step 1: Apply the Migration

First, ensure the migration has been applied to your Supabase database:

### Option A: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and run the contents of `supabase/migrations/005_add_skill_questions.sql`

### Option B: Using Supabase CLI (if you have it set up)
```bash
supabase db push
```

## Step 2: Add Test Questions to a Skill

Run this SQL query in your Supabase SQL Editor to add test questions to an existing skill:

```sql
-- Example: Add questions to "Stock analysis" skill for Analyst Bear (mascot_id: 11111111-1111-1111-1111-111111111111)
UPDATE public.mascot_skills
SET skill_questions = '{
  "questions": [
    {
      "id": "storage-question",
      "type": "choice",
      "label": "Where should skills and skill prompts be stored?",
      "choices": ["Database (new tables for skills and skill_prompts)", "Code/config files (easier to version control)", "Hybrid (skills in DB, prompts in secure table)"],
      "required": true
    },
    {
      "id": "prompt-type",
      "type": "choice",
      "label": "What are skill prompts exactly?",
      "choices": ["Additional prompts added to the system prompt when a skill is selected", "Prefix added to user messages when skill is clicked"],
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

**To find a skill ID**, run this query first:
```sql
SELECT id, skill_label, mascot_id 
FROM public.mascot_skills 
WHERE is_active = true 
ORDER BY skill_label 
LIMIT 10;
```

## Step 3: Test the UI Flow

1. **Start your development server:**
   ```bash
   npm start
   # or
   npm run web
   ```

2. **Navigate to a mascot chat:**
   - Open the app and go to a mascot that has skills
   - For the example above, go to "Analyst Bear" (ID: 1)

3. **Click on a skill with questions:**
   - You should see the skill pills at the bottom
   - Click on "Stock analysis" (or whichever skill you added questions to)
   - The skill pill should disappear immediately

4. **Answer the questions:**
   - A modal should appear with "Questions 1 of 3"
   - Select an answer for the first question (multiple choice)
   - Click "Next" (button should be enabled after selecting)
   - Answer the second question
   - Fill in the text input for the third question (optional)
   - Click "Continue" on the last question

5. **Verify the skill executes:**
   - After completing questions, the skill should execute
   - The LLM should receive the skill prompt + your answers
   - Check the chat to see if the response incorporates your answers

## Step 4: Test Edge Cases

### Test 1: Skip Questions
- Click on the skill with questions
- Click "Skip" on the first question
- Modal should close and skill should NOT execute

### Test 2: Required Questions
- Try to proceed without answering a required question
- "Next" button should be disabled

### Test 3: Skill Without Questions
- Click on a skill that has no questions configured
- Should execute immediately without showing modal

### Test 4: Multiple Skills
- Click on one skill (it disappears)
- Click on another skill (should work normally)

## Step 5: Verify in Database

Check that the questions are stored correctly:

```sql
SELECT 
  skill_label,
  skill_questions->>'questions' as questions_json
FROM public.mascot_skills
WHERE skill_questions IS NOT NULL;
```

## Step 6: Test Different Question Types

You can test various question configurations:

```sql
-- Test with all question types
UPDATE public.mascot_skills
SET skill_questions = '{
  "questions": [
    {
      "id": "q1",
      "type": "choice",
      "label": "Select an option",
      "choices": ["Option A", "Option B", "Option C", "Option D", "Option E", "Option F"],
      "required": true
    },
    {
      "id": "q2",
      "type": "text",
      "label": "Enter details",
      "placeholder": "Type here...",
      "required": false
    }
  ]
}'::jsonb
WHERE skill_label = 'Your Skill Name Here';
```

## Troubleshooting

### Modal doesn't appear:
- Check browser console for errors
- Verify `skill_questions` is not NULL in database
- Ensure the skill has `questions` array with at least one question

### Questions not showing:
- Verify JSON structure matches the expected format
- Check that `questions` is an array
- Ensure each question has required fields: `id`, `type`, `label`

### Skill executes without questions:
- Check that `skill_questions` column was added correctly
- Verify the RPC function `get_mascot_skills` includes `skill_questions`
- Check browser network tab to see what data is being fetched

### Answers not included in prompt:
- Check browser console for errors in `executeSkill`
- Verify `questionAnswers` is being passed correctly
- Look at the actual message sent to LLM in network requests

## Quick Test Query

To quickly test with a simple question set:

```sql
UPDATE public.mascot_skills
SET skill_questions = '{"questions": [{"id": "test", "type": "choice", "label": "Test question?", "choices": ["Yes", "No"], "required": false}]}'::jsonb
WHERE skill_label = 'Stock analysis'
LIMIT 1;
```

This adds a simple single-choice question to test the basic flow.
