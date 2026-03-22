ALTER TABLE babysitter_shifts
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
  CHECK (payment_status IN ('paid', 'unpaid'));

ALTER TABLE babysitter_shifts
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

UPDATE babysitter_shifts
SET payment_status = 'unpaid'
WHERE payment_status IS NULL;

CREATE INDEX IF NOT EXISTS babysitter_shifts_babysitter_payment_date_idx
  ON babysitter_shifts (babysitter_id, payment_status, shift_date DESC, created_at DESC);
