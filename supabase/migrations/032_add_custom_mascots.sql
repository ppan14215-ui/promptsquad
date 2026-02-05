-- Add owner_id to mascots table to support custom user-created mascots
ALTER TABLE public.mascots 
ADD COLUMN owner_id UUID REFERENCES auth.users(id),
ADD COLUMN is_custom BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX idx_mascots_owner_id ON public.mascots(owner_id);

-- Update RLS policies
-- Allow users to read:
-- 1. Public mascots (owner_id IS NULL)
-- 2. Their own private mascots (owner_id = auth.uid())
DROP POLICY IF EXISTS "Enable read access for all users" ON public.mascots;

CREATE POLICY "Enable read access for all users and owners" ON public.mascots
FOR SELECT USING (
  (owner_id IS NULL) OR (owner_id = auth.uid())
);

-- Allow users to insert their own mascots (if they are authenticated)
-- Ideally we check for Pro status here, but that's complex in RLS often. 
-- For now, just enforce owner_id = auth.uid()
CREATE POLICY "Enable insert for authenticated users" ON public.mascots
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND owner_id = auth.uid()
);

-- Allow users to update their own mascots
CREATE POLICY "Enable update for owners" ON public.mascots
FOR UPDATE USING (
  owner_id = auth.uid()
);

-- Allow users to delete their own mascots
CREATE POLICY "Enable delete for owners" ON public.mascots
FOR DELETE USING (
  owner_id = auth.uid()
);
