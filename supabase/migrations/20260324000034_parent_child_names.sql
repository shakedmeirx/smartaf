ALTER TABLE public.parent_profiles
  ADD COLUMN IF NOT EXISTS child_names text[] NOT NULL DEFAULT '{}';
