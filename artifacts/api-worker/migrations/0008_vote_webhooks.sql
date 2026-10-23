PRAGMA foreign_keys = ON;

-- Outbound webhook endpoints that receive vote lifecycle notifications.
CREATE TABLE IF NOT EXISTS vote_webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT NOT NULL DEFAULT '[]',
  is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vote_webhooks_enabled
  ON vote_webhooks(is_enabled, created_at DESC);

-- Delivery attempts, kept for administrator diagnostics. Payloads contain no ballot choices.
CREATE TABLE IF NOT EXISTS vote_webhook_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_id INTEGER NOT NULL REFERENCES vote_webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  vote_id INTEGER,
  status_code INTEGER,
  ok INTEGER NOT NULL DEFAULT 0,
  error TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vote_webhook_deliveries_webhook
  ON vote_webhook_deliveries(webhook_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_vote_webhook_deliveries_vote
  ON vote_webhook_deliveries(vote_id, created_at DESC);

-- One-time notification markers so each vote transition is announced exactly once.
ALTER TABLE votes ADD COLUMN notify_started_at TEXT;
ALTER TABLE votes ADD COLUMN notify_closing_soon_at TEXT;
ALTER TABLE votes ADD COLUMN notify_closed_at TEXT;

-- Do not backfill lifecycle notifications for votes that existed before the
-- webhook feature. Future scheduled votes remain pending until their start time.
UPDATE votes
SET notify_started_at = created_at
WHERE is_published = 1
  AND is_closed = 0
  AND julianday(deadline) > julianday('now')
  AND (starts_at IS NULL OR julianday(starts_at) <= julianday('now'));

UPDATE votes
SET notify_closing_soon_at = created_at
WHERE is_published = 1
  AND is_closed = 0
  AND julianday(deadline) > julianday('now')
  AND julianday(deadline) <= julianday('now', '+1 day');

UPDATE votes
SET notify_closed_at = created_at
WHERE is_closed = 1 OR julianday(deadline) <= julianday('now');

CREATE INDEX IF NOT EXISTS idx_votes_notification_pending
  ON votes(is_published, is_closed, deadline, starts_at);
