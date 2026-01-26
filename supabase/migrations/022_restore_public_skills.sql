-- RESTORE PUBLIC READ ACCESS
-- Required because the Chat runs on the client and needs the prompt text to function.

-- 1. Enable RLS (already enabled, but good to be sure)
ALTER TABLE mascot_skills ENABLE ROW LEVEL SECURITY;

-- 2. Drop the restrictive "Admins only" policy if it exists (and any other conflicting policies)
DROP POLICY IF EXISTS "Admins have full access" ON mascot_skills;
DROP POLICY IF EXISTS "Public Read Access" ON mascot_skills;

-- 3. Create a permissive Read policy for everyone
CREATE POLICY "Public Read Access" ON mascot_skills
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- 4. Keep Write access restricted (optional, but good practice)
-- Note: You might already have an admin policy, this ensures it exists.
DROP POLICY IF EXISTS "Admins Write Access" ON mascot_skills;
CREATE POLICY "Admins Write Access" ON mascot_skills
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
