# DB Schema

## Indexes

Apply after all tables are created:

```sql
-- player_stats: stats lookup by player + season
CREATE INDEX ON player_stats(player_id, season);
CREATE INDEX ON player_stats(player_id, season, stat_type);

-- games: today's game query (filtered by date + status)
CREATE INDEX ON games(game_date, status);

-- game_players: players in a game / games for a player
CREATE INDEX ON game_players(game_id);
CREATE INDEX ON game_players(player_id);

-- game_logs: graph data lookup
CREATE INDEX ON game_logs(player_id, game_date);
CREATE INDEX ON game_logs(player_id, stat_type);

-- ai_usage: daily limit check
CREATE INDEX ON ai_usage(user_id, usage_date);

-- user_favorites: favorites list
CREATE INDEX ON user_favorites(user_id);

-- ai_logs: Pro soft-limit count and cost monitoring
CREATE INDEX ON ai_logs(user_id, created_at);
```

---

## players
```sql
id                VARCHAR PRIMARY KEY  -- MLB Stats API player_id (numeric string e.g. "660271")
names             JSONB NOT NULL       -- {"en": "Shohei Ohtani", "ja": "大谷翔平", "ko": "..."}
team              JSONB                -- {"en": "LA Dodgers", "ja": "ロサンゼルス・ドジャース"}
position          VARCHAR
is_japanese       BOOLEAN DEFAULT false
photo_url         VARCHAR
active            BOOLEAN DEFAULT true
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()
```
> Adding a new language requires only a new key in the JSONB object — no schema migration needed.
> Query example: `SELECT names->>'ja' FROM players WHERE id = '660271'`

## player_stats
```sql
id                SERIAL PRIMARY KEY
player_id         VARCHAR REFERENCES players(id)
season            INTEGER
stat_type         VARCHAR NOT NULL  -- 'batting' or 'pitching' (two-way players like Ohtani have 2 rows per season)
games             INTEGER
-- Batting (used when stat_type='batting')
avg               DECIMAL(4,3)
home_runs         INTEGER
rbi               INTEGER
ops               DECIMAL(4,3)
hits              INTEGER
-- Pitching (used when stat_type='pitching')
era               DECIMAL(4,2)
wins              INTEGER
strikeouts        INTEGER
whip              DECIMAL(4,2)
updated_at        TIMESTAMP DEFAULT NOW()
UNIQUE(player_id, season, stat_type)
```

## games
```sql
id                VARCHAR PRIMARY KEY  -- MLB Stats API gamePk
home_team         JSONB                -- {"en": "NY Yankees", "ja": "ヤンキース"}
away_team         JSONB                -- {"en": "LA Dodgers", "ja": "ドジャース"}
home_score        INTEGER              -- NULL until game starts
away_score        INTEGER              -- NULL until game starts
inning            INTEGER              -- current/final inning (NULL if not started)
game_date         DATE
status            VARCHAR  -- scheduled/live/final (maps to abstractGameState in API)
venue             VARCHAR
updated_at        TIMESTAMP DEFAULT NOW()
```

## game_players
```sql
-- Junction table for tracking which Japanese players appear in each game
-- Used by GET /api/games/today to filter games with Japanese players
id                SERIAL PRIMARY KEY
game_id           VARCHAR REFERENCES games(id)
player_id         VARCHAR REFERENCES players(id)
UNIQUE(game_id, player_id)
```

## users (profiles)
```sql
-- Extends Supabase Auth's auth.users (1:1)
-- Password management handled by Supabase Auth
id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
email             VARCHAR UNIQUE NOT NULL
plan              VARCHAR DEFAULT 'free'  -- free/pro
stripe_customer_id VARCHAR
lang              VARCHAR DEFAULT 'ja'
created_at        TIMESTAMP DEFAULT NOW()
```

## user_favorites
```sql
id                SERIAL PRIMARY KEY
user_id           UUID REFERENCES users(id)
player_id         VARCHAR REFERENCES players(id)
created_at        TIMESTAMP DEFAULT NOW()
UNIQUE(user_id, player_id)
```

## game_logs
```sql
-- Per-game stats for graph rendering (Phase 2)
-- Populated by the hourly sync job from MLB Stats API /people/{id}/gameLog
id                SERIAL PRIMARY KEY
player_id         VARCHAR REFERENCES players(id)
game_id           VARCHAR REFERENCES games(id)
game_date         DATE
stat_type         VARCHAR NOT NULL  -- 'batting' or 'pitching'
-- Batting
at_bats           INTEGER
hits              INTEGER
home_runs         INTEGER
rbi               INTEGER
avg               DECIMAL(4,3)      -- cumulative season avg as of this game
-- Pitching
innings_pitched   DECIMAL(4,1)
earned_runs       INTEGER
strikeouts        INTEGER
era               DECIMAL(4,2)      -- cumulative season ERA as of this game
created_at        TIMESTAMP DEFAULT NOW()
UNIQUE(player_id, game_id, stat_type)
```

## ai_usage
```sql
id                SERIAL PRIMARY KEY
user_id           UUID REFERENCES users(id)
usage_date        DATE  -- JST date; must be set explicitly from app layer via usage_date_jst(), never rely on DB DEFAULT
summary_count     INTEGER DEFAULT 0
created_at        TIMESTAMP DEFAULT NOW()
UNIQUE(user_id, usage_date)
```

## ai_logs
```sql
-- Every AI call is logged here for cost monitoring and Pro soft-limit tracking (100 calls/day)
id                SERIAL PRIMARY KEY
user_id           UUID REFERENCES users(id)
feature           VARCHAR  -- 'summary' / 'analysis' / 'chat'
model             VARCHAR  -- 'gemini-pro' / 'claude-sonnet-4-6'
input_tokens      INTEGER
output_tokens     INTEGER
latency_ms        INTEGER
created_at        TIMESTAMP DEFAULT NOW()
```
