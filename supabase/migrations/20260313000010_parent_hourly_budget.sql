ALTER TABLE public.parent_profiles
  ADD COLUMN IF NOT EXISTS hourly_budget integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'parent_profiles_hourly_budget_positive'
  ) THEN
    ALTER TABLE public.parent_profiles
      ADD CONSTRAINT parent_profiles_hourly_budget_positive
      CHECK (hourly_budget IS NULL OR hourly_budget > 0);
  END IF;
END $$;
