-- Allow mascot owners to manage their own skills
CREATE POLICY "Owners can manage their mascot skills"
  ON public.mascot_skills
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mascots
      WHERE mascots.id = mascot_skills.mascot_id
      AND mascots.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mascots
      WHERE mascots.id = mascot_skills.mascot_id
      AND mascots.owner_id = auth.uid()
    )
  );

-- Allow mascot owners to manage their own personality
CREATE POLICY "Owners can manage their mascot personality"
  ON public.mascot_personality
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mascots
      WHERE mascots.id = mascot_personality.mascot_id
      AND mascots.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mascots
      WHERE mascots.id = mascot_personality.mascot_id
      AND mascots.owner_id = auth.uid()
    )
  );
