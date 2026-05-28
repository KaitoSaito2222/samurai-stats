# Samurai Stats — CLAUDE.md

## Project Overview

**Samurai Stats** is a bilingual (Japanese/English) web app for browsing MLB player stats, with a focus on Japanese player analysis and commentary. Target audiences are Japanese fans of Japanese MLB players and international fans interested in Japanese players.

Planned future migration to React Native. Web components should be designed with this migration in mind.

> Sub-directory CLAUDE.md files contain domain-specific details:
> - `frontend/CLAUDE.md` — screens, i18n, component guidelines
> - `backend/CLAUDE.md` — API endpoints, MLB Stats API, auth, Stripe
> - `docs/testing.md` — test strategy for frontend and backend
> - `docs/infra.md` — branch strategy, CI/CD pipeline, required secrets

@docs/testing.md
@docs/infra.md

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router, TypeScript) |
| Backend | FastAPI (Python) |
| DB | PostgreSQL (Supabase) |
| AI (Free users) | Gemini API |
| AI (Pro users) | Claude API (claude-sonnet-4-6) |
| Payments | Stripe |
| Infrastructure | Railway |
| Data source (stats) | MLB Stats API (free, no auth required) |
| Data source (Statcast) | Baseball Savant CSV (free, no auth required) |
| Languages | Japanese / English (i18n) |

---

## Directory Structure

```
samurai-stats/
├── frontend/                  # Next.js
│   ├── app/
│   │   └── [locale]/          # i18n (ja/en)
│   ├── components/
│   │   └── analytics/         # SplitsTab, MonthlyTab, StatcastTab, ZoneHeatmap
│   ├── lib/
│   └── messages/              # ja.json / en.json
│
├── backend/                   # FastAPI
│   ├── main.py
│   ├── routers/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   │   ├── mlb_api.py
│   │   ├── baseball_savant.py  # Statcast CSV fetch & aggregation
│   │   ├── japanese_data.py    # Japanese name/team mappings + photo URLs
│   │   ├── gemini.py
│   │   ├── claude.py
│   │   └── stripe.py
│   └── database.py
```

---

## Plan Features

| Feature | Free | Pro |
|---|---|---|
| Home, player list, rankings, game detail | ✓ | ✓ |
| MLB full player search | ✓ | ✓ |
| AI quick summary (Gemini) | ✓ (3/day, shared with analysis) | ✓ (100/day soft cap†) |
| AI basic analysis (Gemini) | ✓ (3/day, shared with summary) | ✓ (100/day soft cap†) |
| AI detailed analysis (Claude) | ✗ | ✓ (100/day soft cap†) |
| AI chat (Claude) | ✗ | ✓ (100/day soft cap†) |
| Stats trend graphs | ✗ | ✓ |
| Statcast analytics (splits / monthly / zone heatmap) | ✗ | ✓ |
| Favorite notifications (post-app) | ✗ | ✓ |

> † Pro soft cap: backend returns `X-AI-Remaining: <n>` header when fewer than 10 calls remain in the day (JST). Frontend shows a warning banner. Hard block does not apply to Pro users.

---

## Department Definitions (Multi-Agent)

### Frontend Department
- **Scope**: Next.js components, screens, i18n, responsive design
- **Tech**: Next.js App Router, TypeScript, next-intl, Tailwind CSS
- **Interfaces with**: Backend (API schema), AI Engineering (chat UI)

### Backend Department
- **Scope**: FastAPI endpoints, DB operations, business logic, auth
- **Tech**: FastAPI, Python, PostgreSQL, Supabase Auth, SQLAlchemy
- **Interfaces with**: Data (MLB API), AI Engineering (AI router), Infrastructure (env vars)

### AI Engineering Department
- **Scope**: Prompt design, Gemini/Claude API integration, usage limit logic
- **Tech**: Gemini API, Claude API (claude-sonnet-4-6), Python
- **Interfaces with**: Backend (ai.py), Data (stats retrieval)

### Infrastructure Department
- **Scope**: Railway, Supabase config, Stripe Webhook, env var management
- **Tech**: Railway, Supabase, Stripe, Docker

### Data Department
- **Scope**: MLB Stats API integration, data fetch jobs, cache strategy
- **Tech**: MLB Stats API, Python, PostgreSQL
- **Interfaces with**: Backend (mlb_api.py)

### SEO Department
- **Scope**: Technical SEO, metadata, structured data, Core Web Vitals
- **Tech**: Next.js Metadata API, sitemap/robots, JSON-LD
- **Interfaces with**: Frontend (page components, next/image, next/dynamic)

---

## Shared Development Guidelines

- **Type annotations**: Required on all Python functions/methods (enforced by mypy)
- **Code comments**: Write in English
- **Commit messages**: Write in English
- **Responsive**: Mobile-first (React Native migration in mind)
- **Docs sync**: When changing behavior, interfaces, or constraints in code, update the relevant CLAUDE.md or docs/*.md in the same change. Code and docs must stay in sync — a doc that contradicts the code is worse than no doc.

---

## Development Priority (Phase 1 MVP)

1. FastAPI foundation + MLB Stats API integration
2. Japanese player list & detail retrieval
3. Next.js home screen & player list screen
4. AI quick summary (Gemini)
5. Japanese/English toggle (i18n)
6. Railway deployment

Phase 2+: Stripe billing, AI chat, detailed stats analysis, React Native migration.

### Phase 2 — Detailed Stats Analysis
- **Monthly trend graphs**: ✅ batting avg / OPS / HR by month (Victory charts) — implemented
- **Splits**: ✅ vs LHP/RHP, Home/Away, Day/Night — implemented
- **Statcast analytics**: ✅ exit velocity, barrel rate, xBA, pitch splits, 9-zone heatmap — implemented
- **Period comparison**: current season vs same period last year (MLB API `byDateRange`) — pending
- **AI performance evaluation**: Claude analyzes multi-year trends and highlights weak/strong periods — pending
- **Game log storage**: persist per-game stats in `game_logs` table for fast graph rendering — pending
- All analysis features are **Pro only**
