ALTER TABLE votes ADD COLUMN starts_at TEXT;
ALTER TABLE votes ADD COLUMN is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1));

CREATE INDEX IF NOT EXISTS idx_votes_publish_schedule
  ON votes(is_published, starts_at, is_closed, deadline);
