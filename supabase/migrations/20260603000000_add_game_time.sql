-- Add scheduled game time (UTC) to games table.
-- Used for displaying game start time to users in their local timezone.
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_time TIMESTAMPTZ;
-- NOTE: Existing rows will have game_time = NULL until the daily sync
-- re-processes each date. Frontend falls back to showing game_date when NULL.
-- Re-run POST /internal/sync/schedule for recent dates to backfill.
