-- Add scheduled game time (UTC) to games table.
-- Used for displaying game start time to users in their local timezone.
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_time TIMESTAMPTZ;
-- NOTE: Existing rows will have game_time = NULL until the daily sync
-- re-processes each date. Frontend falls back to showing game_date when NULL.
-- Re-run POST /internal/sync/schedule for recent dates to backfill.

-- Tell PostgREST to reload its schema cache so it recognises the new column.
-- Without this, PostgREST (started before this migration ran) won't know
-- about game_time and will reject any upsert that includes the field.
NOTIFY pgrst, 'reload schema';
