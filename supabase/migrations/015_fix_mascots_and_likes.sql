-- Fix for "only 6 mascots showing" and "like button failing"
-- 1. Activate all mascots
-- 2. Open up RLS for reading mascots and likes to public (authenticated not required for basic viewing)

-- 1. Ensure all mascots are active
UPDATE public.mascots SET is_active = true;

-- 2. Update RLS policies for mascots table
-- Allow public access to view active mascots (no auth required)
DROP POLICY IF EXISTS "Mascots are viewable by authenticated users" ON public.mascots;

CREATE POLICY "Mascots are viewable by everyone" 
  ON public.mascots FOR SELECT 
  USING (is_active = true);

-- 3. Update RLS policies for mascot_likes table
-- Allow public access to view likes (counts)
DROP POLICY IF EXISTS "Anyone can view mascot likes" ON public.mascot_likes;

CREATE POLICY "Anyone can view mascot likes" 
  ON public.mascot_likes FOR SELECT 
  USING (true);

-- Ensure authenticated users can still insert/delete their own likes (these should already exist, but reinforcing)
-- The existing policies "Users can insert own likes" and "Users can delete own likes" from 002_enable_rls.sql should be fine.
