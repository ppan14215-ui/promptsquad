-- Add is_pro and is_ready columns to mascots table

ALTER TABLE public.mascots 
ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_ready BOOLEAN DEFAULT false;

-- Migrate existing data logic
-- All existing mascots are considered "ready" for now so they don't disappear
UPDATE public.mascots SET is_ready = true;

-- Mascots 5-20 were previously hardcoded as "Pro" (Premium)
-- IDs are strings in DB, but assuming they are numeric strings '1'...'20'
-- We cast to integer for comparison
UPDATE public.mascots 
SET is_pro = true 
WHERE id ~ '^[0-9]+$' AND id::int > 4;

-- Ensure free mascots are not pro (just in case)
UPDATE public.mascots 
SET is_pro = false 
WHERE id ~ '^[0-9]+$' AND id::int <= 4;
