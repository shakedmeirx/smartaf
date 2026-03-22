-- ─────────────────────────────────────────────────────────────────────────────
-- Allow authenticated users to create their own row in public.users.
--
-- Context: createUser() in AuthContext is called immediately after a successful
-- OTP verification, using the user's own JWT (not the service key). Without
-- this policy, RLS blocks the insert and the onboarding flow fails.
--
-- The WITH CHECK clause ensures a user can only ever insert a row whose id
-- matches their own auth.uid() — they cannot create rows for other users.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Users can create their own row"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
