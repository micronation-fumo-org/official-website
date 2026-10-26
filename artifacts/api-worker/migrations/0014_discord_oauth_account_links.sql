PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS discord_account_links (
  voter_id TEXT PRIMARY KEY REFERENCES voter_accounts(voter_id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL UNIQUE,
  discord_username TEXT NOT NULL,
  linked_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS discord_oauth_states (
  state_hash TEXT PRIMARY KEY,
  flow TEXT NOT NULL CHECK (flow IN ('login', 'link')),
  voter_id TEXT REFERENCES voter_accounts(voter_id) ON DELETE CASCADE,
  return_to TEXT NOT NULL CHECK (return_to = '/login'),
  code_verifier TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK ((flow = 'login' AND voter_id IS NULL) OR (flow = 'link' AND voter_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_discord_oauth_states_expiry ON discord_oauth_states(expires_at);
