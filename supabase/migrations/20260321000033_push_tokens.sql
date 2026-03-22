-- ─── Push notification tokens ─────────────────────────────────────────────────
-- One row per user per device. Upserted on every app launch so tokens stay fresh.

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token      text        NOT NULL,
  platform   text        NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read and write only their own tokens
CREATE POLICY "push_tokens_own_read"
  ON public.push_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "push_tokens_own_upsert"
  ON public.push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_tokens_own_update"
  ON public.push_tokens FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "push_tokens_own_delete"
  ON public.push_tokens FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
