-- After removing public contact fields from public.users, reopen read access
-- for lightweight directory data so request/chat/profile joins can still
-- resolve display names without exposing phone or email.

DROP POLICY IF EXISTS "Users can read their own row" ON public.users;

DROP POLICY IF EXISTS "Authenticated users can read public user directory" ON public.users;
CREATE POLICY "Authenticated users can read public user directory"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);
