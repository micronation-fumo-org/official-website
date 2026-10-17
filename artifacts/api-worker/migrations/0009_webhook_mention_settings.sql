-- Per-endpoint Discord mention policy. Existing endpoints retain the current role
-- and mention every event they already subscribe to.
ALTER TABLE vote_webhooks
  ADD COLUMN discord_role_ids TEXT NOT NULL DEFAULT '["1337422468566093845"]';

ALTER TABLE vote_webhooks
  ADD COLUMN mention_events TEXT NOT NULL DEFAULT '["vote.created","vote.published","vote.started","vote.closing_soon","vote.closed","ballot.cast"]';
