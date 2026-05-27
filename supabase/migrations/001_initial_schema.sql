-- Samurai Stats — initial schema
-- Runs automatically on first `docker compose up` (empty pgdata volume).
-- For subsequent changes: create 002_*.sql, 003_*.sql, etc.
--
-- The supabase/postgres image pre-creates the auth schema, roles
-- (anon, authenticated, service_role, authenticator), and auth.users.
-- This file only creates application tables.

-- ── players ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
    id           VARCHAR PRIMARY KEY,  -- MLB Stats API player_id (e.g. "660271")
    names        JSONB NOT NULL,       -- {"en": "Shohei Ohtani", "ja": "大谷翔平"}
    team         JSONB,                -- {"en": "LA Dodgers", "ja": "ロサンゼルス・ドジャース"}
    position     VARCHAR,
    is_japanese  BOOLEAN DEFAULT false,
    photo_url    VARCHAR,
    active       BOOLEAN DEFAULT true,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── player_stats ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_stats (
    id           SERIAL PRIMARY KEY,
    player_id    VARCHAR NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    season       INTEGER NOT NULL,
    stat_type    VARCHAR NOT NULL CHECK (stat_type IN ('batting', 'pitching')),
    games        INTEGER,
    -- Batting
    avg          DECIMAL(4,3),
    home_runs    INTEGER,
    rbi          INTEGER,
    ops          DECIMAL(4,3),
    hits         INTEGER,
    -- Pitching
    era          DECIMAL(4,2),
    wins         INTEGER,
    strikeouts   INTEGER,
    whip         DECIMAL(4,2),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (player_id, season, stat_type)
);

-- ── games ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS games (
    id          VARCHAR PRIMARY KEY,  -- MLB Stats API gamePk
    home_team   JSONB,
    away_team   JSONB,
    home_score  INTEGER,
    away_score  INTEGER,
    inning      INTEGER,
    game_date   DATE NOT NULL,
    status      VARCHAR NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','live','final','postponed','cancelled')),
    venue       VARCHAR,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── game_players ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_players (
    id        SERIAL PRIMARY KEY,
    game_id   VARCHAR REFERENCES games(id) ON DELETE CASCADE,
    player_id VARCHAR REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE (game_id, player_id)
);

-- ── users (profiles — extends auth.users 1:1) ────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email              VARCHAR UNIQUE NOT NULL,
    plan               VARCHAR NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
    stripe_customer_id VARCHAR,
    lang               VARCHAR DEFAULT 'ja',
    created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── user_favorites ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_favorites (
    id        SERIAL PRIMARY KEY,
    user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
    player_id VARCHAR REFERENCES players(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, player_id)
);

-- ── game_logs (Phase 2 — graph data) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_logs (
    id              SERIAL PRIMARY KEY,
    player_id       VARCHAR REFERENCES players(id) ON DELETE CASCADE,
    game_id         VARCHAR REFERENCES games(id) ON DELETE CASCADE,
    -- Denormalized from games.game_date for index performance.
    -- Must be kept in sync with games.game_date (update both on postponement).
    game_date       DATE NOT NULL,
    stat_type       VARCHAR NOT NULL CHECK (stat_type IN ('batting', 'pitching')),
    at_bats         INTEGER,
    hits            INTEGER,
    home_runs       INTEGER,
    rbi             INTEGER,
    avg             DECIMAL(4,3),
    innings_pitched DECIMAL(4,1),
    earned_runs     INTEGER,
    strikeouts      INTEGER,
    era             DECIMAL(4,2),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (player_id, game_id, stat_type)
);

-- ── ai_usage (Free tier daily limit tracking) ────────────────────────────
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

-- ── ai_logs (cost monitoring + Pro soft-limit tracking) ──────────────────
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

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_player_stats_player_season  ON player_stats (player_id, season);
CREATE INDEX IF NOT EXISTS idx_player_stats_player_season_type ON player_stats (player_id, season, stat_type);
CREATE INDEX IF NOT EXISTS idx_games_date_status           ON games (game_date, status);
CREATE INDEX IF NOT EXISTS idx_game_players_game           ON game_players (game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_player         ON game_players (player_id);
CREATE INDEX IF NOT EXISTS idx_game_logs_player_date       ON game_logs (player_id, game_date);
CREATE INDEX IF NOT EXISTS idx_game_logs_player_type       ON game_logs (player_id, stat_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date          ON ai_usage (user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user         ON user_favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_created        ON ai_logs (user_id, created_at);

-- ── PostgREST grants ──────────────────────────────────────────────────────
-- anon: public read-only access to non-sensitive tables
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON players, player_stats, games, game_players TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
