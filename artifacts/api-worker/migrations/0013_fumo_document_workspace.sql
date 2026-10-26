CREATE TABLE IF NOT EXISTS fumo_workspace_documents (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT '文件',
  starred INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fumo_workspace_documents_updated_at
  ON fumo_workspace_documents(updated_at DESC);

CREATE TABLE IF NOT EXISTS fumo_workspace_shares (
  id TEXT PRIMARY KEY NOT NULL,
  document_id TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fumo_workspace_shares_created_at
  ON fumo_workspace_shares(created_at DESC);
