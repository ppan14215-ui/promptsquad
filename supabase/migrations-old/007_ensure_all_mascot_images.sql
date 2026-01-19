-- =============================================
-- ENSURE ALL MASCOT IMAGES HAVE DATABASE ENTRIES
-- =============================================

-- IMPORTANT: This migration requires migration 001_initial_schema.sql to be run first
-- to create the mascots table. Run migrations in order: 001, 002, 003, 004, 005, 006, 007

-- Add mascots for all images in assets/mascots folder if they don't exist
-- Images available: bear, cat, fox, owl, panda, turtle, zebra, badger, mouse, pig, camel, frog, giraffe, lion, seahorse

-- Use INSERT ... ON CONFLICT to ensure all mascots exist with correct image_url
-- This will insert missing mascots or update existing ones (only the first 6 exist from 001)
INSERT INTO public.mascots (id, name, subtitle, image_url, color, is_free, sort_order, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Analyst Bear', 'Great at research', 'bear', '#EDB440', true, 1, true),
  ('22222222-2222-2222-2222-222222222222', 'Writer Fox', 'Best at writing', 'fox', '#ED7437', true, 2, true),
  ('33333333-3333-3333-3333-333333333333', 'UX Panda', 'Principal UX skills', 'panda', '#74AE58', true, 3, true),
  ('44444444-4444-4444-4444-444444444444', 'Advice Zebra', 'Here to support', 'zebra', '#EB3F71', true, 4, true),
  ('55555555-5555-5555-5555-555555555555', 'Teacher Owl', 'Lets teach our kids', 'owl', '#5E24CB', false, 5, true),
  ('66666666-6666-6666-6666-666666666666', 'Prompt Turtle', 'Slow but steady', 'turtle', '#59C19D', false, 6, true),
  ('77777777-7777-7777-7777-777777777777', 'Data Badger', 'Analytics expert', 'badger', '#826F57', false, 7, true),
  ('88888888-8888-8888-8888-888888888888', 'Quick Mouse', 'Fast problem solver', 'mouse', '#2D6CF5', false, 8, true),
  ('99999999-9999-9999-9999-999999999999', 'Creative Pig', 'Design thinking', 'pig', '#EB3F71', false, 9, true),
  ('10101010-1010-1010-1010-101010101010', 'Code Cat', 'Programming wizard', 'cat', '#2D2E66', false, 10, true),
  ('11111111-1111-1111-1111-111111111112', 'Strategy Camel', 'Planning expert', 'camel', '#826F57', false, 11, true),
  ('12121212-1212-1212-1212-121212121212', 'Marketing Frog', 'Growth hacker', 'frog', '#59C19D', false, 12, true),
  ('13131313-1313-1313-1313-131313131313', 'Product Giraffe', 'Product management', 'giraffe', '#EDB440', false, 13, true),
  ('14141414-1414-1414-1414-141414141414', 'Support Lion', 'Customer success', 'lion', '#ED7437', false, 14, true),
  ('15151515-1515-1515-1515-151515151515', 'Mentor Seahorse', 'Career guidance', 'seahorse', '#2D6CF5', false, 15, true)
ON CONFLICT (id) DO UPDATE SET 
  image_url = EXCLUDED.image_url,
  name = EXCLUDED.name,
  subtitle = EXCLUDED.subtitle,
  is_active = EXCLUDED.is_active;

-- Note: This ensures all 15 mascot images have corresponding database entries
-- If a mascot already exists, it updates the image_url, name, and subtitle to match
-- This ensures all images in assets folder have corresponding database entries
