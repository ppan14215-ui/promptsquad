-- Allow Pro (subscribed) users to edit personality and add/edit skills for any mascot.
-- Uses profiles.is_subscribed and subscription_expires_at so RLS matches app logic.

-- Helper: true when current user has an active Pro subscription
-- (is_subscribed and not expired)

-- Pro users can manage any mascot's personality
CREATE POLICY "Pro users can manage mascot personality"
  ON public.mascot_personality
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_subscribed = true
        AND (p.subscription_expires_at IS NULL OR p.subscription_expires_at > now())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_subscribed = true
        AND (p.subscription_expires_at IS NULL OR p.subscription_expires_at > now())
    )
  );

-- Pro users can manage any mascot's skills
CREATE POLICY "Pro users can manage mascot skills"
  ON public.mascot_skills
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_subscribed = true
        AND (p.subscription_expires_at IS NULL OR p.subscription_expires_at > now())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_subscribed = true
        AND (p.subscription_expires_at IS NULL OR p.subscription_expires_at > now())
    )
  );
