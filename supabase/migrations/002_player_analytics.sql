-- Samurai Stats — player analytics table
-- Stores aggregated Statcast data (exit velocity, barrel rate, xBA, pitch splits,
-- zone stats) fetched from Baseball Savant CSV and synced weekly.

CREATE TABLE IF NOT EXISTS player_analytics (
    player_id  VARCHAR NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    season     INTEGER NOT NULL,
    data       JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (player_id, season)
);
