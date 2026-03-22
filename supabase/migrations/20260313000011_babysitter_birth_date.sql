ALTER TABLE public.babysitter_profiles
  ADD COLUMN IF NOT EXISTS birth_date date;
