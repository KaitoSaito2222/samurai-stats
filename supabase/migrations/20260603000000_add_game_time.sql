-- Add scheduled game time (UTC) to games table.
-- Used for displaying game start time to users in their local timezone.
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_time TIMESTAMPTZ;
