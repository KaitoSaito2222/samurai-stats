# Infrastructure

## Branch Strategy

```
main       → production (auto-deploy on merge)
develop    → staging / integration (CI runs on PR and merge)
feature/*  → individual features (PR into develop)
```

Never commit directly to `main` or `develop`.

## CI/CD Pipeline

```
feature/* → PR to develop → CI (tests + lint + typecheck)
                ↓ merge
            develop
                ↓ PR to main
            CI runs again → migrate DB → deploy backend + frontend
```

**Workflow files:**
- `.github/workflows/ci.yml` — runs on develop PR/push
- `.github/workflows/deploy.yml` — runs on main merge (calls ci.yml first)

## Required GitHub Secrets

Set these in GitHub → Settings → Secrets and variables → Actions:

| Secret | Description |
|---|---|
| `SUPABASE_TEST_URL` | Supabase URL for test project |
| `SUPABASE_TEST_SERVICE_ROLE_KEY` | Service role key for test project |
| `SUPABASE_PROJECT_REF` | Production project ref (from Supabase dashboard) |
| `SUPABASE_ACCESS_TOKEN` | Personal access token for Supabase CLI |
| `SUPABASE_DB_PASSWORD` | Production DB password |
| `RAILWAY_TOKEN` | Railway API token |
| `GEMINI_API_KEY` | Gemini API key (set as Railway env var for backend) |
| `ANTHROPIC_API_KEY` | Anthropic API key (set as Railway env var for backend) |

## Supabase Migrations

Use Supabase CLI for all DB schema changes:

```bash
supabase migration new add_game_logs_table   # create new migration file
supabase db push                              # apply to production (done by CI)
supabase db reset                            # reset local dev DB
```

Never modify production DB manually — always go through migrations.

## Deploy Order (on main merge)

1. CI passes (tests + lint)
2. DB migrations applied
3. Backend deployed (parallel with frontend)
4. Frontend deployed (parallel with backend)
