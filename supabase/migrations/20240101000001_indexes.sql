-- Samurai Stats — performance indexes
-- All statements use IF NOT EXISTS; safe to re-run.

-- player_analytics: Statcast lookup by player + season
CREATE INDEX IF NOT EXISTS idx_player_analytics_player_season
    ON player_analytics (player_id, season);

-- player_stats: stats lookup by player + season
CREATE INDEX IF NOT EXISTS idx_player_stats_player_season
    ON player_stats (player_id, season);

CREATE INDEX IF NOT EXISTS idx_player_stats_player_season_type
    ON player_stats (player_id, season, stat_type);

-- games: today's game query (filtered by date + status)
CREATE INDEX IF NOT EXISTS idx_games_date_status
    ON games (game_date, status);

-- game_players: players in a game / games for a player
CREATE INDEX IF NOT EXISTS idx_game_players_game
    ON game_players (game_id);

CREATE INDEX IF NOT EXISTS idx_game_players_player
    ON game_players (player_id);

-- game_logs: graph data lookup
CREATE INDEX IF NOT EXISTS idx_game_logs_player_date
    ON game_logs (player_id, game_date);

CREATE INDEX IF NOT EXISTS idx_game_logs_player_type
    ON game_logs (player_id, stat_type);

-- ai_usage: daily limit check
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date
    ON ai_usage (user_id, usage_date);

-- user_favorites: favorites list
CREATE INDEX IF NOT EXISTS idx_user_favorites_user
    ON user_favorites (user_id);

-- ai_logs: Pro soft-limit count and cost monitoring
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_created
    ON ai_logs (user_id, created_at);

-- Tell PostgREST to reload its schema cache after all migrations have run.
-- Without this, PostgREST may start (triggered by the DB healthcheck) before
-- the schema migrations complete and miss newly created tables.
NOTIFY pgrst, 'reload schema';
