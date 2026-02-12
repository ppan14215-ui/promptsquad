-- Add a dedicated manual bio field for mascot details cards.
ALTER TABLE public.mascots
ADD COLUMN IF NOT EXISTS bio TEXT;

COMMENT ON COLUMN public.mascots.bio IS 'Short manual bio shown in mascot details.';
