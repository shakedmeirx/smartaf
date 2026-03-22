ALTER TABLE public.parent_profiles
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.babysitter_profiles
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'parent_profiles_latitude_valid'
  ) THEN
    ALTER TABLE public.parent_profiles
      ADD CONSTRAINT parent_profiles_latitude_valid
      CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'parent_profiles_longitude_valid'
  ) THEN
    ALTER TABLE public.parent_profiles
      ADD CONSTRAINT parent_profiles_longitude_valid
      CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'babysitter_profiles_latitude_valid'
  ) THEN
    ALTER TABLE public.babysitter_profiles
      ADD CONSTRAINT babysitter_profiles_latitude_valid
      CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'babysitter_profiles_longitude_valid'
  ) THEN
    ALTER TABLE public.babysitter_profiles
      ADD CONSTRAINT babysitter_profiles_longitude_valid
      CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
  END IF;
END $$;
