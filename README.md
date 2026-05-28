# Samurai Stats

Bilingual (Japanese/English) web app for browsing MLB player stats, focused on Japanese players.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router, TypeScript) |
| Backend | FastAPI (Python 3.11) |
| Database | PostgreSQL via Supabase |
| AI (Free) | Gemini 2.0 Flash |
| AI (Pro) | Claude (claude-sonnet-4-6) |
| Payments | Stripe |
| Hosting | Railway |

---

## Local Development

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose)
- `make` (pre-installed on macOS/Linux; Windows: use WSL or run the commands manually)

### 1. Clone and configure

```bash
git clone https://github.com/KaitoSaito2222/samurai-stats.git
cd samurai-stats
cp .env.local.example .env.local
```

Open `.env.local` and fill in the AI keys (only required if you want AI features):

```
GEMINI_API_KEY=your-gemini-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

All other values in `.env.local.example` work as-is for local development.

### 2. Start all services

```bash
make up
```

This starts six Docker containers:

| Container | URL | Purpose |
|---|---|---|
| `samurai-stats-frontend` | http://localhost:3000 | Next.js dev server (hot reload) |
| `samurai-stats-backend` | http://localhost:8000 | FastAPI (hot reload) |
| `samurai-stats-supabase` | http://localhost:8080 | Nginx proxy (auth + REST) |
| `samurai-stats-auth` | — | GoTrue (Supabase Auth) |
| `samurai-stats-rest` | — | PostgREST (table API) |
| `samurai-stats-db` | localhost:5432 | PostgreSQL |

The database schema is applied automatically on first start.

### 3. Verify the services are running

```bash
# Backend health check
curl http://localhost:8000/health
# → {"status":"ok"}

# Supabase proxy health check
curl http://localhost:8080/health
# → {"status":"ok"}

# Frontend — open in browser
open http://localhost:3000
```

### 4. Useful commands

```bash
make logs          # tail logs for all containers
make down          # stop all containers (preserves database)
make reset         # wipe database and restart from scratch
make migrate       # re-run migrations manually
make shell-db      # psql shell inside the DB container
make shell-backend # bash shell inside the backend container
```

---

## Verifying Features

### Player list
1. Open http://localhost:3000 (or http://localhost:3000/ja for Japanese)
2. Click **Players** in the navbar → should show a paginated list of Japanese MLB players
3. Note: the list is empty until the sync job runs. Seed it manually:

```bash
curl -X POST http://localhost:8000/internal/sync/players \
  -H "X-Internal-API-Key: local-internal-key"
```

### Today's games
```bash
curl -X POST http://localhost:8000/internal/sync/schedule \
  -H "X-Internal-API-Key: local-internal-key"
```

Then refresh the home page — today's games with Japanese players appear.

### Stats sync (required for Rankings page)
```bash
curl -X POST http://localhost:8000/internal/sync/stats \
  -H "X-Internal-API-Key: local-internal-key"
```

Then open http://localhost:3000/ja/rankings — batting (OPS) and pitching (ERA) rankings appear.

### Statcast analytics (zone heatmap, barrel rate, etc.)
Takes ~1 second per player. Run after `sync/players`:
```bash
curl -X POST http://localhost:8000/internal/sync/statcast \
  -H "X-Internal-API-Key: local-internal-key"
```

Then navigate to any player detail page → **詳細分析** tab → Statcast data and zone heatmap.

### AI summary
1. Sign up at http://localhost:3000/signup
2. Navigate to any player detail page
3. Click **Generate AI Summary** (requires `GEMINI_API_KEY` in `.env.local`)
4. Free users get 3 summaries per day (JST)

### AI chat (Pro only)
1. Sign up and upgrade to Pro (or manually set `plan = 'pro'` in the DB: `make shell-db` → `UPDATE users SET plan='pro' WHERE email='you@example.com';`)
2. Navigate to any player detail page → **AIチャット** section
3. Requires `ANTHROPIC_API_KEY` in `.env.local`

### MLB player search
Open http://localhost:3000/ja/search (auth required) → type a player name → results from the full MLB roster appear.

### Billing page
Open http://localhost:3000/ja/billing — Free/Pro plan cards are shown.
The **Upgrade to Pro** button requires real Stripe test keys (`STRIPE_SECRET_KEY=sk_test_...`).
For local testing without Stripe, upgrade manually via `make shell-db`.

### API docs (Swagger UI)
FastAPI's interactive docs are available at:
```
http://localhost:8000/docs
```

---

## Running Static Checks

```bash
# Backend — linting + type check
cd backend
ruff check .
mypy . --ignore-missing-imports

# Frontend — type check
cd frontend
npm run typecheck
```

---

## Branch Strategy

```
main        → production (auto-deploy on merge)
develop     → staging / integration
feature/*   → individual features (PR into develop)
```

Never commit directly to `main` or `develop`.

---

## Environment Variables

See `.env.local.example` for all required variables.
For production, set the same keys as Railway environment variables (backend) and Vercel/Railway environment variables (frontend).
