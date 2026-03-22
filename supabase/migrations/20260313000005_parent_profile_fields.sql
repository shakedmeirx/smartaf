-- ─────────────────────────────────────────────────────────────────────────────
-- Parent profile fields for lightweight onboarding
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.parent_profiles
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS children_count integer,
  ADD COLUMN IF NOT EXISTS child_age_groups text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS family_note text NOT NULL DEFAULT '';
