-- Structured in-app legal/support requests plus privacy hardening for public.users.

CREATE TABLE IF NOT EXISTS public.support_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  request_type text NOT NULL CHECK (request_type IN ('support', 'privacy', 'delete', 'safety')),
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'received', 'in_review', 'resolved', 'rejected')),
  name         text NOT NULL,
  email        text NOT NULL,
  phone        text,
  subject      text NOT NULL,
  message      text NOT NULL,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS support_requests_user_id_idx
  ON public.support_requests (user_id);

CREATE INDEX IF NOT EXISTS support_requests_type_status_created_at_idx
  ON public.support_requests (request_type, status, created_at DESC);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_requests_anon_insert" ON public.support_requests;
CREATE POLICY "support_requests_anon_insert"
  ON public.support_requests
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "support_requests_auth_insert" ON public.support_requests;
CREATE POLICY "support_requests_auth_insert"
  ON public.support_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "support_requests_auth_read_own" ON public.support_requests;
CREATE POLICY "support_requests_auth_read_own"
  ON public.support_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can read all users" ON public.users;

DROP POLICY IF EXISTS "Users can read their own row" ON public.users;
CREATE POLICY "Users can read their own row"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
