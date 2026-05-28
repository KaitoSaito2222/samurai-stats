-- Samurai Stats — initial schema
-- All CREATE TABLE statements in dependency order.
-- Safe to re-run: all statements use IF NOT EXISTS.

-- ── players ───────────────────────────────────────────────────────────────────
-- Must be created first; all other tables reference players(id).
CREATE TABLE IF NOT EXISTS players (
    id          VARCHAR PRIMARY KEY,       -- MLB Stats API player_id (e.g. "660271")
    names       JSONB NOT NULL,            -- {"en": "Shohei Ohtani", "ja": "大谷翔平"}
    team        JSONB,                     -- {"en": "LA Dodgers", "ja": "ロサンゼルス・ドジャース"}
    position    VARCHAR,
    is_japanese BOOLEAN DEFAULT false,
    photo_url   VARCHAR,
    active      BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── player_stats ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_stats (
    id         SERIAL PRIMARY KEY,
    player_id  VARCHAR NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    season     INTEGER NOT NULL,
    stat_type  VARCHAR NOT NULL CHECK (stat_type IN ('batting', 'pitching')),
    games      INTEGER,
    -- Batting (used when stat_type = 'batting')
    avg        DECIMAL(4,3),
    home_runs  INTEGER,
    rbi        INTEGER,
    ops        DECIMAL(4,3),
    hits       INTEGER,
    -- Pitching (used when stat_type = 'pitching')
    era        DECIMAL(4,2),
    wins       INTEGER,
    strikeouts INTEGER,
    whip       DECIMAL(4,2),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (player_id, season, stat_type)
);

-- ── player_analytics ─────────────────────────────────────────────────────────
-- Aggregated Statcast data from Baseball Savant CSV, synced weekly.
-- Stores exit velocity, barrel rate, xBA, pitch splits, and 9-zone batting avg.
-- Raw pitch data is NOT stored — only pre-aggregated results.
CREATE TABLE IF NOT EXISTS player_analytics (
    player_id  VARCHAR NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    season     INTEGER NOT NULL,
    data       JSONB NOT NULL DEFAULT '{}',
    -- Shape: {
    --   exit_velocity_avg, barrel_rate, hard_hit_rate, launch_angle_avg,
    --   xba, xslg,
    --   pitch_splits: [{pitch_type, pitch_name_ja, pitch_name_en, pa, avg, whiff_rate, hr, k}],
    --   zone_stats:   [{zone (1-9), pa, avg}]
    -- }
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (player_id, season)
);

-- ── games ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS games (
    id         VARCHAR PRIMARY KEY,  -- MLB Stats API gamePk
    home_team  JSONB,                -- {"en": "NY Yankees", "ja": "ヤンキース"}
    away_team  JSONB,                -- {"en": "LA Dodgers", "ja": "ドジャース"}
    home_score INTEGER,              -- NULL until game starts
    away_score INTEGER,              -- NULL until game starts
    inning     INTEGER,              -- current/final inning (NULL if not started)
    game_date  DATE NOT NULL,
    status     VARCHAR NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled', 'live', 'final', 'postponed', 'cancelled')),
    venue      VARCHAR,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── game_players ──────────────────────────────────────────────────────────────
-- Junction table: tracks which Japanese players appear in each game.
-- Used by GET /api/games/today to filter games with Japanese players.
CREATE TABLE IF NOT EXISTS game_players (
    id        SERIAL PRIMARY KEY,
    game_id   VARCHAR REFERENCES games(id) ON DELETE CASCADE,
    player_id VARCHAR REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE (game_id, player_id)
);

-- ── users (profiles — extends Supabase auth.users 1:1) ───────────────────────
-- Password management is handled by Supabase Auth (GoTrue).
CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email               VARCHAR UNIQUE NOT NULL,
    plan                VARCHAR NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
    stripe_customer_id  VARCHAR,
    lang                VARCHAR DEFAULT 'ja',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── user_favorites ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_favorites (
    id        SERIAL PRIMARY KEY,
    user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
    player_id VARCHAR REFERENCES players(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, player_id)
);

-- ── game_logs (Phase 2 — per-game stats for graph rendering) ─────────────────
-- Populated by the hourly sync job from MLB Stats API /people/{id}/gameLog.
-- game_date is denormalized from games.game_date for query performance.
-- The sync job must always write game_date = games.game_date for the same game_id.
-- On game postponement, update both games.game_date AND game_logs.game_date.
CREATE TABLE IF NOT EXISTS game_logs (
    id              SERIAL PRIMARY KEY,
    player_id       VARCHAR REFERENCES players(id) ON DELETE CASCADE,
    game_id         VARCHAR REFERENCES games(id) ON DELETE CASCADE,
    game_date       DATE NOT NULL,
    stat_type       VARCHAR NOT NULL CHECK (stat_type IN ('batting', 'pitching')),
    -- Batting
    at_bats         INTEGER,
    hits            INTEGER,
    home_runs       INTEGER,
    rbi             INTEGER,
    avg             DECIMAL(4,3),  -- cumulative season avg as of this game
    -- Pitching
    innings_pitched DECIMAL(4,1),
    earned_runs     INTEGER,
    strikeouts      INTEGER,
    era             DECIMAL(4,2),  -- cumulative season ERA as of this game
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (player_id, game_id, stat_type)
);

-- ── ai_usage (Free tier daily limit tracking) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_usage (
    id            SERIAL PRIMARY KEY,
    user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    -- JST date — set explicitly via usage_date_jst(); never rely on DB DEFAULT.
    usage_date    DATE NOT NULL,
    -- Counts both summary AND analysis calls (shared 3/day Free limit).
    ai_call_count INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, usage_date)
);

-- ── ai_logs (cost monitoring + Pro soft-limit tracking) ───────────────────────
-- Every AI call is logged here for cost monitoring and Pro soft-limit (100 calls/day).
CREATE TABLE IF NOT EXISTS ai_logs (
    id            SERIAL PRIMARY KEY,
    user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    feature       VARCHAR NOT NULL CHECK (feature IN ('summary', 'analysis', 'chat')),
    model         VARCHAR NOT NULL CHECK (model IN ('gemini-2.0-flash', 'claude-sonnet-4-6')),
    input_tokens  INTEGER,
    output_tokens INTEGER,
    latency_ms    INTEGER,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
