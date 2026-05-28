# Testing Strategy

## Tools

| Layer | Tool |
|---|---|
| Backend unit & integration | pytest |
| Frontend unit & component | Vitest + React Testing Library |

## Core Principle

- **Real DB** (Supabase test project): integration tests hit a real database — never mock Supabase
- **Mock MLB API**: avoid rate limits and flakiness in tests
- **Mock AI APIs** (Gemini / Claude): avoid cost and non-determinism in tests

## Backend Test Structure

```
backend/tests/
├── unit/
│   ├── test_usage_limit.py      # Free 3/day reset logic (JST midnight)
│   ├── test_plan_gating.py      # 403 returned for Pro features on Free plan
│   ├── test_mlb_parser.py       # MLB API response → JSONB mapping
│   └── test_statcast_aggregator.py  # CSV rows → aggregated dict (barrel rate, zone stats)
├── integration/
│   ├── test_players_api.py      # GET /api/players/japanese (real DB)
│   ├── test_analytics_api.py    # GET /api/players/{id}/analytics — cache + DB merge
│   ├── test_ai_api.py           # Usage limit enforcement end-to-end
│   └── test_billing_webhook.py  # Stripe signature verification
└── mocks/
    ├── mlb_api.py               # Fixture returning sample MLB API responses
    ├── baseball_savant.py       # Fixture returning sample Statcast CSV rows
    └── ai_api.py                # Fixture returning deterministic AI responses
```

**Priority tests** (write these first):
1. `test_usage_limit.py` — most complex business logic, easy to get wrong
2. `test_plan_gating.py` — security boundary
3. `test_billing_webhook.py` — Stripe signature must be verified correctly
4. `test_statcast_aggregator.py` — barrel rate / zone calc logic is easy to get wrong

## Frontend Test Structure

```
frontend/tests/
├── lib/
│   └── api.test.ts              # axios interceptor: 403 → redirect/prompt
└── components/
    ├── StatsChart.test.tsx      # Victory chart renders with empty/valid data
    └── ZoneHeatmap.test.tsx     # 9-zone grid renders with null/low/high avg data
```

## What NOT to Test

- MLB Stats API response format (external — just mock it)
- Baseball Savant CSV format (external — mock with sample rows)
- AI response content (non-deterministic — mock the call, test the prompt construction)
- Supabase Auth internals (trust the SDK)
