UPDATE storage.buckets
SET public = false
WHERE id IN ('parent-photos', 'babysitter-photos');

DROP POLICY IF EXISTS "Parent photos are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Babysitter photos are publicly readable" ON storage.objects;

CREATE POLICY "Authenticated users can read parent photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'parent-photos');

CREATE POLICY "Authenticated users can read babysitter photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'babysitter-photos');
