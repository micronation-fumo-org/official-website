ALTER TABLE attendance_sessions
  ADD COLUMN is_draft INTEGER NOT NULL DEFAULT 0 CHECK (is_draft IN (0, 1));
