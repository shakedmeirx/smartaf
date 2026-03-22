-- Babysitter saved posts (bookmarks)
CREATE TABLE IF NOT EXISTS babysitter_saved_posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    uuid NOT NULL REFERENCES parent_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

ALTER TABLE babysitter_saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_posts_read_own"
  ON babysitter_saved_posts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "saved_posts_insert_own"
  ON babysitter_saved_posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_posts_delete_own"
  ON babysitter_saved_posts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
