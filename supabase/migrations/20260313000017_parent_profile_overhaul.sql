-- ─────────────────────────────────────────────────────────────────────────────
-- Parent profile overhaul: richer family identity, child DOBs, pets, and
-- parent profile photo support
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.parent_profiles
  ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address_full text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS child_birth_dates date[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pets text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS profile_photo_path text;

INSERT INTO storage.buckets (id, name, public)
SELECT 'parent-photos', 'parent-photos', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'parent-photos'
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Parent photos are publicly readable'
  ) THEN
    CREATE POLICY "Parent photos are publicly readable"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'parent-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Parents can upload their own profile photos'
  ) THEN
    CREATE POLICY "Parents can upload their own profile photos"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'parent-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Parents can update their own profile photos'
  ) THEN
    CREATE POLICY "Parents can update their own profile photos"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'parent-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      )
      WITH CHECK (
        bucket_id = 'parent-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Parents can delete their own profile photos'
  ) THEN
    CREATE POLICY "Parents can delete their own profile photos"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'parent-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END
$$;
