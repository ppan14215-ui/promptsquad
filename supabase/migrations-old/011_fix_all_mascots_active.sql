-- =============================================
-- FORCE ALL MASCOTS TO BE ACTIVE
-- This ensures all 20 mascots are active and visible
-- =============================================

-- First, verify the current state
SELECT 
  COUNT(*) as total_mascots,
  COUNT(*) FILTER (WHERE is_active = true) as active_count,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
  COUNT(*) FILTER (WHERE is_active IS NULL) as null_active_count
FROM public.mascots;

-- Force ALL mascots to be active (regardless of current state)
UPDATE public.mascots 
SET is_active = true,
    updated_at = NOW()
WHERE is_active = false OR is_active IS NULL;

-- Verify the fix
SELECT 
  COUNT(*) as total_mascots,
  COUNT(*) FILTER (WHERE is_active = true) as active_count
FROM public.mascots;

-- List all mascots with their active status
SELECT 
  id,
  name,
  is_active,
  sort_order
FROM public.mascots
ORDER BY sort_order;

-- Test query that should return 20
SELECT COUNT(*) as visible_count
FROM public.mascots
WHERE is_active = true;
