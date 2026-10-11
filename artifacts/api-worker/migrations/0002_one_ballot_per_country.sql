-- Enforce one ballot per country for each vote.
-- Apply after any existing duplicate country ballots have been resolved.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ballots_vote_country
  ON ballots(vote_id, country_name);
