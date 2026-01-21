-- =============================================
-- RENAME INSTRUCTIONS TO PERSONALITY
-- Rename table, columns, and related objects
-- =============================================

-- Check current state and handle accordingly
DO $$
BEGIN
  -- If mascot_instructions exists, rename it to mascot_personality
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'mascot_instructions'
  ) THEN
    -- Drop old trigger if it exists (drop before renaming table)
    DROP TRIGGER IF EXISTS set_updated_at_mascot_instructions ON public.mascot_instructions;
    
    -- Rename the table
    ALTER TABLE public.mascot_instructions RENAME TO mascot_personality;
    
    RAISE NOTICE 'Renamed mascot_instructions to mascot_personality';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'mascot_personality'
  ) THEN
    RAISE NOTICE 'Table mascot_personality already exists, skipping rename';
  ELSE
    RAISE NOTICE 'Neither mascot_instructions nor mascot_personality exists - table may need to be created';
  END IF;
END $$;

-- Rename the columns
-- Only rename if they exist (handle case where default_instructions might not exist yet)
DO $$
BEGIN
  -- Rename instructions column (should always exist)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'mascot_personality' 
    AND column_name = 'instructions'
  ) THEN
    ALTER TABLE public.mascot_personality RENAME COLUMN instructions TO personality;
  END IF;
  
  -- Rename default_instructions column (might not exist if migration 007 hasn't run)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'mascot_personality' 
    AND column_name = 'default_instructions'
  ) THEN
    ALTER TABLE public.mascot_personality RENAME COLUMN default_instructions TO default_personality;
  ELSE
    -- If default_instructions doesn't exist, create default_personality column
    -- This ensures the column exists for future use
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'mascot_personality' 
      AND column_name = 'default_personality'
    ) THEN
      ALTER TABLE public.mascot_personality 
      ADD COLUMN default_personality TEXT;
    END IF;
  END IF;
END $$;

-- Rename indexes
ALTER INDEX IF EXISTS idx_mascot_instructions_mascot_id 
RENAME TO idx_mascot_personality_mascot_id;

-- Recreate trigger with new name (since ALTER TRIGGER doesn't support IF EXISTS)
DO $$
BEGIN
  -- Only create if the set_updated_at function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    -- Drop trigger if it exists (in case it was already created with new name)
    DROP TRIGGER IF EXISTS set_updated_at_mascot_personality ON public.mascot_personality;
    
    -- Create trigger with new name
    CREATE TRIGGER set_updated_at_mascot_personality
      BEFORE UPDATE ON public.mascot_personality
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If trigger creation fails, just continue (might already exist)
    NULL;
END $$;

-- Drop old policies and recreate with new names
-- Use DO block to ensure proper execution order
DO $$
BEGIN
  -- Drop old policies (with "instructions" in name)
  DROP POLICY IF EXISTS "Anyone can read mascot instructions" ON public.mascot_personality;
  DROP POLICY IF EXISTS "Users can update instructions" ON public.mascot_personality;
  DROP POLICY IF EXISTS "Admins can insert instructions" ON public.mascot_personality;
  DROP POLICY IF EXISTS "Admins can delete instructions" ON public.mascot_personality;
  DROP POLICY IF EXISTS "Admins can manage mascot instructions" ON public.mascot_personality;

  -- Drop new policies if they already exist (in case migration was partially run)
  DROP POLICY IF EXISTS "Anyone can read mascot personality" ON public.mascot_personality;
  DROP POLICY IF EXISTS "Users can update personality" ON public.mascot_personality;
  DROP POLICY IF EXISTS "Admins can insert personality" ON public.mascot_personality;
  DROP POLICY IF EXISTS "Admins can delete personality" ON public.mascot_personality;
END $$;

-- Recreate policies with new names (in DO block to handle errors gracefully)
DO $$
BEGIN
  -- Create "Anyone can read mascot personality" policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'mascot_personality' 
    AND policyname = 'Anyone can read mascot personality'
  ) THEN
    CREATE POLICY "Anyone can read mascot personality" 
      ON public.mascot_personality FOR SELECT 
      TO authenticated
      USING (true);
  END IF;

  -- Create "Users can update personality" policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'mascot_personality' 
    AND policyname = 'Users can update personality'
  ) THEN
    CREATE POLICY "Users can update personality" 
      ON public.mascot_personality FOR UPDATE 
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Create "Admins can insert personality" policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'mascot_personality' 
    AND policyname = 'Admins can insert personality'
  ) THEN
    CREATE POLICY "Admins can insert personality" 
      ON public.mascot_personality FOR INSERT 
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  -- Create "Admins can delete personality" policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'mascot_personality' 
    AND policyname = 'Admins can delete personality'
  ) THEN
    CREATE POLICY "Admins can delete personality" 
      ON public.mascot_personality FOR DELETE 
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If policy creation fails, log and continue
    RAISE NOTICE 'Error creating policies: %', SQLERRM;
END $$;

-- Update comments
COMMENT ON TABLE public.mascot_personality IS 'Stores personality traits and behavior instructions for each mascot';
COMMENT ON COLUMN public.mascot_personality.personality IS 'Personality traits and behavior instructions for the mascot';

-- Only add comment on default_personality if the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'mascot_personality' 
    AND column_name = 'default_personality'
  ) THEN
    COMMENT ON COLUMN public.mascot_personality.default_personality IS 'Admin-set default personality. Used as fallback when resetting user-edited personality.';
  END IF;
END $$;
