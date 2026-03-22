-- ─────────────────────────────────────────────────────────────────────────────
-- Multi-role account support
--
-- Goal:
-- - keep exactly one public.users row per auth user / phone number
-- - treat parent_profiles and babysitter_profiles as the source of truth for roles
-- - stop request creation policies from assuming users.role is the only role marker
--
-- users.role is kept temporarily as a legacy hint for older app flows, but it is
-- no longer required because one account may eventually hold both roles.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users
  ALTER COLUMN role DROP NOT NULL;

COMMENT ON COLUMN public.users.role IS
  'Legacy single-role hint kept for backward compatibility. Real role membership is determined by profile existence.';

DROP POLICY IF EXISTS "Parents can create requests" ON public.requests;

CREATE POLICY "Parents can create requests"
  ON public.requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = parent_id
    AND EXISTS (
      SELECT 1
      FROM public.parent_profiles
      WHERE user_id = auth.uid()
    )
  );
