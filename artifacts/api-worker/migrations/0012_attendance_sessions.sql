PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  event_date TEXT,
  is_open INTEGER NOT NULL DEFAULT 1 CHECK (is_open IN (0, 1)),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_status_date
  ON attendance_sessions(is_open, event_date, created_at);

CREATE TABLE IF NOT EXISTS attendance_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  country_name TEXT NOT NULL,
  country_status TEXT NOT NULL CHECK (country_status IN ('member', 'observer')),
  voter_id TEXT NOT NULL,
  attended_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (session_id, country_name)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_session_status_country
  ON attendance_records(session_id, country_status, country_name);
