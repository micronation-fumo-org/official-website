PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  deadline TEXT NOT NULL,
  options TEXT NOT NULL,
  allow_multiple INTEGER NOT NULL DEFAULT 0,
  is_closed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS voter_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_id TEXT NOT NULL UNIQUE,
  voter_name TEXT NOT NULL,
  country_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  admin_level INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ballots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vote_id INTEGER NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL,
  voter_name TEXT NOT NULL,
  country_name TEXT NOT NULL,
  selected_options TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(vote_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_ballots_vote_id ON ballots(vote_id);
CREATE INDEX IF NOT EXISTS idx_accounts_voter_id ON voter_accounts(voter_id);
