-- Allow signed-in users to browse parent/family profiles.
-- This powers the babysitter home feed of family cards.

CREATE POLICY "Parent profiles are readable to authenticated users"
  ON public.parent_profiles
  FOR SELECT
  TO authenticated
  USING (true);
