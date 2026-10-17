PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS google_registration_pending (
  token_hash TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL,
  google_email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_google_registration_pending_expiry
  ON google_registration_pending(expires_at);
