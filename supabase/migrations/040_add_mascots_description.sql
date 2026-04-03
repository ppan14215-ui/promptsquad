-- Long-form bio shown on the Agents page (distinct from short `bio` on detail cards).
ALTER TABLE public.mascots
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.mascots.description IS 'Long bio / overview text for the Agents page.';
