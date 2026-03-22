-- ─────────────────────────────────────────────────────────────────────────────
-- Babysitter main profile photo support
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.babysitter_profiles
  ADD COLUMN IF NOT EXISTS profile_photo_path text;

INSERT INTO storage.buckets (id, name, public)
SELECT 'babysitter-photos', 'babysitter-photos', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'babysitter-photos'
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Babysitter photos are publicly readable'
  ) THEN
    CREATE POLICY "Babysitter photos are publicly readable"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'babysitter-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Babysitters can upload their own profile photos'
  ) THEN
    CREATE POLICY "Babysitters can upload their own profile photos"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'babysitter-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Babysitters can update their own profile photos'
  ) THEN
    CREATE POLICY "Babysitters can update their own profile photos"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'babysitter-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      )
      WITH CHECK (
        bucket_id = 'babysitter-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Babysitters can delete their own profile photos'
  ) THEN
    CREATE POLICY "Babysitters can delete their own profile photos"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'babysitter-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END
$$;
