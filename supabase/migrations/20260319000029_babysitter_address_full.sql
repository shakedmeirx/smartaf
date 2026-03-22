-- Add address_full column to babysitter_profiles.
-- Existing rows default to empty string gracefully.
ALTER TABLE babysitter_profiles
  ADD COLUMN IF NOT EXISTS address_full text NOT NULL DEFAULT '';
