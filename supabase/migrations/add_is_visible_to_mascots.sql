-- Add is_visible column to mascots table
-- This controls whether the mascot is visible to pro and standard users
-- Separate from is_active (which controls "ready" status)
ALTER TABLE mascots ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true;

-- Update RLS policy if needed (mascots should be readable by all authenticated users)
-- The filtering by is_visible is done in the application layer
