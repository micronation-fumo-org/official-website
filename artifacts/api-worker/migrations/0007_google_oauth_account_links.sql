PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS google_account_links (
  voter_id TEXT PRIMARY KEY REFERENCES voter_accounts(voter_id) ON DELETE CASCADE,
  google_sub TEXT NOT NULL UNIQUE,
  google_email TEXT NOT NULL,
  linked_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS google_oauth_states (
  state_hash TEXT PRIMARY KEY,
  flow TEXT NOT NULL CHECK (flow IN ('login', 'link')),
  voter_id TEXT REFERENCES voter_accounts(voter_id) ON DELETE CASCADE,
  return_to TEXT NOT NULL CHECK (return_to IN ('/login', '/votes')),
  code_verifier TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK ((flow = 'login' AND voter_id IS NULL) OR (flow = 'link' AND voter_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_google_oauth_states_expiry
  ON google_oauth_states(expires_at);
