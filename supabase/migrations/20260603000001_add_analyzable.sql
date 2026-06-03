-- Add analyzable flag to players table.
-- Controls whether a player has a detail page and is eligible for AI analysis.
-- Decoupled from is_japanese so non-Japanese players can be onboarded independently.
ALTER TABLE players ADD COLUMN IF NOT EXISTS analyzable BOOLEAN NOT NULL DEFAULT false;

-- Backfill: all existing Japanese players are analyzable.
UPDATE players SET analyzable = true WHERE is_japanese = true;

NOTIFY pgrst, 'reload schema';
