-- =============================================
-- ADD USER OWNED MASCOTS TABLE
-- Tracks individual mascot purchases (one-time)
-- =============================================

-- Create the table
CREATE TABLE IF NOT EXISTS public.user_owned_mascots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    mascot_id TEXT NOT NULL,
    stripe_payment_id TEXT, -- Optional: link to Stripe PaymentIntent
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, mascot_id) -- Prevent duplicate purchases
);

-- Enable RLS
ALTER TABLE public.user_owned_mascots ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Users can read their own owned mascots
CREATE POLICY "Users can view their own owned mascots" 
ON public.user_owned_mascots FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Service role can manage everything (for webhooks)
-- No explicit policy needed for service role as it bypasses RLS, but for completeness:
-- (Supabase default is RLS applies to API, service role key bypasses)

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_owned_mascots_user_id 
ON public.user_owned_mascots(user_id);

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Created user_owned_mascots table';
END $$;
