-- D1: Babysitter ratings table
CREATE TABLE IF NOT EXISTS babysitter_ratings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  babysitter_id  uuid NOT NULL REFERENCES babysitter_profiles(id) ON DELETE CASCADE,
  stars          integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  review_text    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_id, babysitter_id)
);

ALTER TABLE babysitter_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read ratings
CREATE POLICY "ratings_read_all"
  ON babysitter_ratings FOR SELECT
  TO authenticated
  USING (true);

-- Parents can insert their own ratings
CREATE POLICY "ratings_insert_own"
  ON babysitter_ratings FOR INSERT
  TO authenticated
  WITH CHECK (parent_id = auth.uid());

-- Parents can update their own ratings
CREATE POLICY "ratings_update_own"
  ON babysitter_ratings FOR UPDATE
  TO authenticated
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

-- Parents can delete their own ratings
CREATE POLICY "ratings_delete_own"
  ON babysitter_ratings FOR DELETE
  TO authenticated
  USING (parent_id = auth.uid());
