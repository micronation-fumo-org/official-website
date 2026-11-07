CREATE TABLE vote_announcement_deliveries (
  vote_id INTEGER PRIMARY KEY REFERENCES votes(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('sending', 'pending', 'sent')),
  claim_token TEXT,
  lease_expires_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  discord_message_id TEXT,
  sent_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX vote_announcement_deliveries_status_lease_idx
  ON vote_announcement_deliveries(status, lease_expires_at);
