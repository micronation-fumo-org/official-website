ALTER TABLE votes ADD COLUMN custom_id TEXT;
ALTER TABLE votes ADD COLUMN regular_meeting_number INTEGER CHECK (regular_meeting_number IS NULL OR regular_meeting_number >= 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_custom_id
  ON votes(custom_id)
  WHERE custom_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_votes_regular_meeting
  ON votes(regular_meeting_number, is_closed, deadline);
