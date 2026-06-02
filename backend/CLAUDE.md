# Backend — CLAUDE.md

See root `CLAUDE.md` for project overview, tech stack, and shared guidelines.

@docs/db-schema.md
@docs/mlb-api.md
@docs/ai-guidelines.md

---

## Timezone Design

All times are stored in **UTC** in the DB. JST (UTC+9) is applied at the application layer.

### "Today's games" definition
`today` = the current calendar date in **JST**, not UTC.

```python
from datetime import datetime
import pytz

JST = pytz.timezone("Asia/Tokyo")

def today_jst() -> date:
    return datetime.now(JST).date()
```

Use `today_jst()` for all queries involving `game_date`, never `datetime.utcnow().date()`.

### The day boundary problem
A game starting at 10pm ET = 11am JST next day.
Samurai Stats treats games by their **scheduled calendar date in JST**:
- Games on `game_date = 2026-05-26 (JST)` appear under "May 26" for Japanese users
- This matches how Japanese fans think about the schedule ("今日の試合")

### ai_usage reset
`usage_date` is stored as a JST date. Reset at JST midnight (00:00 JST = 15:00 UTC previous day).

```python
def usage_date_jst() -> date:
    return datetime.now(JST).date()
```

---

## AI Role Distribution

> For Free/Pro limits per feature, see root `CLAUDE.md` Plan Features table.

| Feature | Model | Notes |
|---|---|---|
| AI quick summary | Gemini API | Free quota shared with basic analysis via `ai_usage.ai_call_count` |
| AI basic analysis | Gemini API | Current-season stats only |
| AI detailed analysis | Claude API | Multi-year trends, period comparison, weakness breakdowns |
| AI chat | Claude API | Streaming required — see `docs/ai-guidelines.md` |

### AI Guidelines
- Japanese responses: casual, fan-friendly tone ("えぐかった", "熱い")
- English responses: casual but information-dense
- Player detail chat: always include recent stats, opponent, and venue in the system prompt
- Use prompt caching (`cache_control`) on Claude API calls to reduce costs
- **Free limit reset**: midnight JST (UTC+9). Store `usage_date` in JST, not UTC

### AI Chat Request Body
```json
POST /api/ai/chat
{
  "player_id": "660271",
  "message": "string",
  "history": [
    { "role": "user",      "content": "string" },
    { "role": "assistant", "content": "string" }
  ]
}
```

---

## API Endpoints

> For Free/Pro gating per endpoint, see root `CLAUDE.md` Plan Features table.

### Players
```
GET  /api/players/japanese?page=1&limit=20
GET  /api/players/{id}
GET  /api/players/{id}/stats
GET  /api/players/{id}/analytics?season={year}   # splits + monthly + Statcast (Pro only)
GET  /api/players/{id}/game-logs?page=1&limit=20
GET  /api/players/search?q={}&page=1&limit=20
```
> In FastAPI, define `/japanese` and `/search` **before** `/{id}` to avoid route conflicts.

`/analytics` response shape:
```json
{
  "player_id": "660271", "season": 2026,
  "splits": {
    "vs_left":  {"pa": 145, "avg": 0.342, "ops": 1.123, "hr": 18},
    "vs_right": {"pa": 312, "avg": 0.241, "ops": 0.876, "hr": 26},
    "home": {...}, "away": {...}, "day": {...}, "night": {...}
  },
  "monthly": [{"month": 4, "avg": 0.234, "ops": 0.812, "hr": 4, "games": 24}, ...],
  "statcast": {
    "exit_velocity_avg": 93.2, "barrel_rate": 12.4, "hard_hit_rate": 48.3,
    "launch_angle_avg": 14.2, "xba": 0.301, "xslg": 0.523,
    "pitch_splits": [{"pitch_type": "FF", "pitch_name_ja": "フォーシーム", ...}],
    "zone_stats": [{"zone": 1, "pa": 45, "avg": 0.180}, ...]
  }
}
```
- `splits` and `monthly` are fetched on-demand from MLB Stats API with 1-hour in-memory cache
- `statcast` is read from `player_analytics` DB table (synced weekly via cron)

### Rankings
```
GET  /api/rankings                  # Separate router — avoids conflict with /players/{id}
```

### Games
```
GET  /api/games/today
GET  /api/games/yesterday
GET  /api/games/{id}
```

### AI
```
POST /api/ai/summary/{player_id}
POST /api/ai/analysis/{player_id}
POST /api/ai/chat
```

### Users
```
GET    /api/user/favorites
POST   /api/user/favorites/{id}
DELETE /api/user/favorites/{id}
GET    /api/user/plan
```

### Billing
```
POST /api/billing/checkout
POST /api/billing/webhook           # Stripe signature verification required
GET  /api/billing/portal
```

**Pagination standard** (all list endpoints):
```json
{ "items": [...], "total": 120, "page": 1, "limit": 20, "has_next": true }
```

---

## Batch Update Architecture

Updates run as **Railway cron jobs** calling internal FastAPI endpoints:

| Job | Endpoint | Schedule |
|---|---|---|
| Japanese player sync | `POST /internal/sync/players` | Weekly Mon 9:00 JST + season start |
| Stats update | `POST /internal/sync/stats` | Every hour |
| Live game update | `POST /internal/sync/live` | Every 2 min during game hours |
| Daily schedule | `POST /internal/sync/schedule` | Daily 6:00 JST |
| Statcast analytics | `POST /internal/sync/statcast` | Weekly (sequential, ~1s/player) |

- `/internal/*` endpoints secured with `INTERNAL_API_KEY` header (not public)
- Live update skips if no `status='live'` games exist

---

## Error Response Format

All error responses use this structure:
```json
{
  "code": "PRO_REQUIRED",
  "message": "This feature requires a Pro plan."
}
```

**Standard error codes:**
| HTTP | code | Situation |
|---|---|---|
| 400 | `INVALID_REQUEST` | Malformed request body |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `PRO_REQUIRED` | Free user accessing Pro feature |
| 403 | `LIMIT_EXCEEDED` | Free AI usage limit reached (3/day) |
| 404 | `NOT_FOUND` | Resource not found |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

Use FastAPI's `HTTPException` with a `detail` dict:
```python
raise HTTPException(status_code=403, detail={"code": "PRO_REQUIRED", "message": "..."})
```

---

## Auth — JWT Validation Pattern

Validate Supabase JWTs using the `supabase-py` client's `auth.get_user()`. Use as a FastAPI dependency:

```python
# dependencies/auth.py
from supabase import Client
from fastapi import Depends, Header, HTTPException
from gotrue.types import User

def get_current_user(authorization: str = Header(...), supabase: Client = Depends(get_supabase)) -> User:
    token = authorization.removeprefix("Bearer ")
    try:
        response = supabase.auth.get_user(token)
        return response.user
    except Exception:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Invalid or expired token."})

def get_optional_user(authorization: str | None = Header(default=None), supabase: Client = Depends(get_supabase)) -> User | None:
    """Use on public endpoints that behave differently when authenticated."""
    if not authorization:
        return None
    return get_current_user(authorization, supabase)
```

Use `Depends(get_current_user)` on protected endpoints:
```python
@router.get("/api/user/plan")
async def get_plan(user: User = Depends(get_current_user)): ...
```

Initialize the Supabase client once in `database.py` using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (service role bypasses RLS for server-side operations).

---

## Backend Guidelines

- HTTP status codes on all endpoints: 200/400/401/403/404/500
- JWT validation via Supabase Auth — never manage passwords directly
- Free/Pro gating: check `users.plan`; return 403 for Pro-only features
- Stripe Webhook: always verify `stripe-signature` (`stripe.webhooks.construct_event`)
- Store `STRIPE_WEBHOOK_SECRET` and `INTERNAL_API_KEY` in env vars — never hardcode
- All functions/methods require type annotations (mypy)
- CORS: configure allowed origins via `ALLOWED_ORIGINS` env var in `main.py`

---

## Security Requirements

### 1. API Rate Limiting

Apply rate limiting globally via `slowapi` middleware. Limits are per IP for unauthenticated requests, per user for authenticated requests.

```python
# main.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# Default limits per endpoint type
# Public (no auth):   60 req/min
# Authenticated:     120 req/min
# AI endpoints:      handled separately via ai_usage table
```

Apply the decorator on every router:
```python
@router.get("/players/search")
@limiter.limit("60/minute")
async def search_players(request: Request, ...): ...
```

### 2. AI Chat History Size Limit

Enforce a maximum of 20 turns in `history` before passing to Claude. Reject requests that exceed this limit.

```python
MAX_HISTORY_TURNS = 20

if len(body.history) > MAX_HISTORY_TURNS:
    raise HTTPException(
        status_code=400,
        detail={"code": "INVALID_REQUEST", "message": "History exceeds maximum of 20 turns."}
    )
```

This prevents cost abuse even for Pro users.

### 3. Pagination Limit Cap

All list endpoints must cap `limit` at 100, regardless of the value passed by the client.

```python
# Apply in every list endpoint
effective_limit = min(limit, 100)
```

Never pass a user-supplied `limit` directly to a DB query.

### 4. Internal Endpoint Network Isolation

`/internal/*` endpoints are protected by `INTERNAL_API_KEY` header, but must also be isolated at the network level.

- Configure Railway **Private Networking** so `/internal/*` routes are unreachable from the public internet
- The `INTERNAL_API_KEY` check is a second layer, not the primary defense
- Document in Railway dashboard: internal service URL is used for cron jobs, not the public URL
