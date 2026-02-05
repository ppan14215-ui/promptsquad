-- =============================================
-- USER MONTHLY USAGE TRACKING
-- Tracks high-tier model usage per user per month
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year VARCHAR(20) NOT NULL, -- Format: 'YYYY-MM'
  high_tier_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

-- Enable RLS
ALTER TABLE public.user_monthly_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own usage
CREATE POLICY "Users can view own usage"
  ON public.user_monthly_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to atomically increment usage
CREATE OR REPLACE FUNCTION public.increment_high_tier_usage(
  p_user_id UUID,
  p_month_year VARCHAR
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.user_monthly_usage (user_id, month_year, high_tier_count)
  VALUES (p_user_id, p_month_year, 1)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    high_tier_count = public.user_monthly_usage.high_tier_count + 1,
    updated_at = NOW()
  RETURNING high_tier_count INTO v_count;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
