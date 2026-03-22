-- ─────────────────────────────────────────────────────────────────────────────
-- Babysitter gallery photos
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.babysitter_gallery_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  babysitter_id uuid NOT NULL REFERENCES public.babysitter_profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  position     integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS babysitter_gallery_photos_babysitter_id_idx
  ON public.babysitter_gallery_photos (babysitter_id);

CREATE INDEX IF NOT EXISTS babysitter_gallery_photos_position_idx
  ON public.babysitter_gallery_photos (babysitter_id, position);

ALTER TABLE public.babysitter_gallery_photos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'babysitter_gallery_photos'
      AND policyname = 'Babysitter gallery photos are publicly readable'
  ) THEN
    CREATE POLICY "Babysitter gallery photos are publicly readable"
      ON public.babysitter_gallery_photos
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'babysitter_gallery_photos'
      AND policyname = 'Babysitters can manage their own gallery photos'
  ) THEN
    CREATE POLICY "Babysitters can manage their own gallery photos"
      ON public.babysitter_gallery_photos
      FOR ALL
      TO authenticated
      USING (public.caller_owns_babysitter_profile(babysitter_id))
      WITH CHECK (public.caller_owns_babysitter_profile(babysitter_id));
  END IF;
END
$$;
