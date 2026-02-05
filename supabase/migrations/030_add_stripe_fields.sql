-- =============================================
-- ADD STRIPE FIELDS TO PROFILES TABLE
-- Stores Stripe customer and subscription IDs
-- =============================================

-- Add Stripe-related columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id 
ON public.profiles(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe Customer ID (cus_...)';
COMMENT ON COLUMN public.profiles.stripe_subscription_id IS 'Stripe Subscription ID (sub_...)';
COMMENT ON COLUMN public.profiles.subscription_status IS 'Subscription status: inactive, active, past_due, canceled';

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Added Stripe fields to profiles table';
END $$;
