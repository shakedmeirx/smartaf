CREATE TABLE IF NOT EXISTS babysitter_shifts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  babysitter_id uuid NOT NULL REFERENCES babysitter_profiles(id) ON DELETE CASCADE,
  parent_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  request_id    uuid REFERENCES requests(id) ON DELETE SET NULL,
  parent_name   text NOT NULL,
  shift_date    date NOT NULL,
  start_time    time NOT NULL,
  end_time      time NOT NULL,
  hours_worked  numeric(6,2) NOT NULL CHECK (hours_worked > 0),
  hourly_rate   numeric(10,2) NOT NULL CHECK (hourly_rate >= 0),
  total_amount  numeric(10,2) NOT NULL CHECK (total_amount >= 0),
  notes         text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS babysitter_shifts_babysitter_date_idx
  ON babysitter_shifts (babysitter_id, shift_date DESC, created_at DESC);

ALTER TABLE babysitter_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "babysitter_shifts_read_own"
  ON babysitter_shifts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM babysitter_profiles
      WHERE babysitter_profiles.id = babysitter_shifts.babysitter_id
        AND babysitter_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "babysitter_shifts_insert_own"
  ON babysitter_shifts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM babysitter_profiles
      WHERE babysitter_profiles.id = babysitter_shifts.babysitter_id
        AND babysitter_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "babysitter_shifts_update_own"
  ON babysitter_shifts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM babysitter_profiles
      WHERE babysitter_profiles.id = babysitter_shifts.babysitter_id
        AND babysitter_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM babysitter_profiles
      WHERE babysitter_profiles.id = babysitter_shifts.babysitter_id
        AND babysitter_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "babysitter_shifts_delete_own"
  ON babysitter_shifts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM babysitter_profiles
      WHERE babysitter_profiles.id = babysitter_shifts.babysitter_id
        AND babysitter_profiles.user_id = auth.uid()
    )
  );
