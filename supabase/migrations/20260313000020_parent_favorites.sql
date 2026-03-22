-- Parent favorites table
CREATE TABLE IF NOT EXISTS parent_favorites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  babysitter_id uuid NOT NULL REFERENCES babysitter_profiles(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_id, babysitter_id)
);

ALTER TABLE parent_favorites ENABLE ROW LEVEL SECURITY;

-- Parents can read their own favorites
CREATE POLICY "favorites_read_own"
  ON parent_favorites FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

-- Parents can add favorites
CREATE POLICY "favorites_insert_own"
  ON parent_favorites FOR INSERT
  TO authenticated
  WITH CHECK (parent_id = auth.uid());

-- Parents can remove their own favorites
CREATE POLICY "favorites_delete_own"
  ON parent_favorites FOR DELETE
  TO authenticated
  USING (parent_id = auth.uid());
