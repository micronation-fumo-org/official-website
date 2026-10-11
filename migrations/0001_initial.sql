PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  deadline TEXT NOT NULL,
  options TEXT NOT NULL CHECK (json_valid(options) AND json_type(options) = 'array'),
  allow_multiple INTEGER NOT NULL DEFAULT 0 CHECK (allow_multiple IN (0, 1)),
  is_closed INTEGER NOT NULL DEFAULT 0 CHECK (is_closed IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ballots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vote_id INTEGER NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL,
  voter_name TEXT NOT NULL,
  country_name TEXT NOT NULL,
  selected_options TEXT NOT NULL CHECK (json_valid(selected_options) AND json_type(selected_options) = 'array'),
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ballots_vote_voter_unique ON ballots(vote_id, voter_id);

CREATE TABLE IF NOT EXISTS voter_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_id TEXT NOT NULL UNIQUE,
  voter_name TEXT NOT NULL,
  country_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  admin_level INTEGER NOT NULL DEFAULT 0 CHECK (admin_level IN (0, 1, 2, 9)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ballots_vote_id_idx ON ballots(vote_id);
CREATE INDEX IF NOT EXISTS voter_accounts_admin_level_idx ON voter_accounts(admin_level);
