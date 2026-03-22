-- ─────────────────────────────────────────────────────────────────────────────
-- Babysitter onboarding fields missing from the initial schema
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.babysitter_profiles
  ADD COLUMN IF NOT EXISTS preferred_location text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS extras text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS profile_visible boolean NOT NULL DEFAULT true;
