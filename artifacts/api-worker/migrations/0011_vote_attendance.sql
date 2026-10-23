PRAGMA foreign_keys = ON;

-- Attendance is deliberately separate from ballots: observers may attend
-- without gaining voting rights, and attendance never changes ballot totals.
CREATE TABLE IF NOT EXISTS vote_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vote_id INTEGER NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  country_name TEXT NOT NULL,
  country_status TEXT NOT NULL CHECK (country_status IN ('member', 'observer')),
  voter_id TEXT NOT NULL,
  attended_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (vote_id, country_name)
);

CREATE INDEX IF NOT EXISTS idx_vote_attendance_vote_status
  ON vote_attendance(vote_id, country_status, country_name);
