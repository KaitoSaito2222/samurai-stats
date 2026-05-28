# Frontend — CLAUDE.md

See root `CLAUDE.md` for project overview, tech stack, and shared guidelines.

## Screens

> Free/Pro feature gating per screen: see root `CLAUDE.md` Plan Features table.

| # | Screen | Path |
|---|---|---|
| 1 | Home | / |
| 2 | Player List | /players |
| 3 | Player Detail + AI Chat | /players/[id] |
| 4 | Rankings | /rankings |
| 5 | MLB Full Player Search | /search |
| 6 | Game Detail | /games/[id] |
| 7 | Settings | /settings |
| 8 | Billing | /billing |
| 9 | Login | /login |
| 10 | Sign Up | /signup |

---

## Auth Flow

- Use **`@supabase/auth-ui-react`** for login and signup forms — do not build custom auth forms
- After login, redirect to the page the user was trying to access (or `/` as fallback)
- Session is managed by Supabase client; `lib/api.ts` attaches the JWT automatically
- Protect routes via `middleware.ts`: unauthenticated access to non-public pages redirects to `/[locale]/login`

**Public routes** (no auth required): `/login`, `/signup`, `/`, `/players`, `/players/[id]`, `/rankings`, `/games/[id]`

**Auth-required routes**: `/search`, `/billing`, `/settings`

---

## Design Tokens

Configure in `tailwind.config.ts`. All components must use these tokens — no raw hex values in JSX.

```ts
colors: {
  brand: {
    DEFAULT: "#C8102E",  // MLB red — primary actions, CTAs
    dark:    "#9E0B24",
  },
  pro: "#F5A623",        // gold — Pro badges, upgrade prompts
  surface: {
    DEFAULT: "#0F172A",  // dark background (app bg)
    card:    "#1E293B",  // card background
    border:  "#334155",  // dividers
  },
},
fontFamily: {
  sans: ["Noto Sans JP", "Inter", "sans-serif"],  // Japanese-first
},
```

> Color rationale: dark theme suits nighttime game-watching; MLB red for brand recognition.

---

## Loading & Error States

Use Next.js App Router conventions — never use conditional rendering for route-level loading/errors.

```
app/[locale]/
├── loading.tsx          # shown automatically during page fetch (skeleton)
├── error.tsx            # shown on unhandled errors (with retry button)
└── players/
    ├── loading.tsx      # player list skeleton
    └── [id]/
        └── loading.tsx  # player detail skeleton
```

**Skeleton pattern**: use `animate-pulse` Tailwind class with gray placeholder blocks — no third-party skeleton library.

**Error boundary** (`error.tsx`): always show a "retry" button (`router.refresh()`). Never show raw error messages to users.

**Empty state**: when API returns `items: []`, show an illustration + message (e.g. "No games today" / "今日の試合はありません"). Never show a blank screen.

---

## i18n

- Use `next-intl`; routes are `/ja/...` and `/en/...` via `[locale]` segment
- Add all new strings to both `messages/ja.json` and `messages/en.json`
- Never hardcode user-facing text — always use translation keys

---

## Component Guidelines

- Extract into `components/`; split any file exceeding 200 lines
- Mobile-first with Tailwind CSS (React Native migration in mind — avoid web-only layout hacks)
- Pro-only features: show a locked UI instead of hiding entirely (conversion opportunity)
- Free/Pro gating is enforced on both frontend (UI) and backend (403)

---

## Charts

Use **Victory** for all graphs (`victory-native` for React Native, `victory` for web — same API).

```ts
import { VictoryLine, VictoryBar, VictoryChart } from "victory";
```

**Chart types by use case:**
| Chart | Use case |
|---|---|
| `VictoryLine` | Monthly trend (AVG / ERA over time) |
| `VictoryBar` | Period comparison (this May vs last May) |
| `VictoryScatter` | Game log dots (per-game performance) |

- All charts are **Pro only** — show a blurred preview with upgrade prompt for Free users
- Wrap in a shared `<StatsChart>` component; swap `victory` ↔ `victory-native` at the import level for RN migration

---

## Analytics Components

`AnalyticsPanel` and its sub-components live in `components/analytics/`:

```
components/
├── AnalyticsPanel.tsx          # Tabbed container + Pro gate (blur + lock overlay)
└── analytics/
    ├── SplitsTab.tsx           # vs LHP/RHP, Home/Away, Day/Night table
    ├── MonthlyTab.tsx          # Victory line chart — AVG/OPS/HR by month
    ├── StatcastTab.tsx         # Metric cards + pitch splits table
    └── ZoneHeatmap.tsx         # 3×3 CSS grid, color-coded by batting avg
```

**Zone heatmap color scale** (avg thresholds):
- `< 5 PA` or null → `bg-slate-700` (insufficient sample)
- `< .200` → `bg-blue-900`
- `.200–.250` → `bg-blue-700`
- `.250–.280` → `bg-slate-600`
- `.280–.320` → `bg-orange-700`
- `≥ .320` → `bg-red-700`

**Pro gate pattern**: Free users see the full panel blurred (`blur-sm`) with an absolute-positioned lock overlay and an upgrade CTA linking to `/{locale}/billing`. Never hide the panel entirely — it's a conversion opportunity.

---

## Timezone Display

- The backend always returns timestamps in **UTC**
- The frontend converts to the **user's local timezone** using the browser API — never display UTC to users

```ts
const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone
// → "Asia/Tokyo" / "America/New_York" / "Europe/London" etc.

new Date(utcString).toLocaleTimeString(locale, { timeZone: userTz })
```

Japanese users automatically see JST; no special-casing needed.

> Server-side timezone logic (JST midnight reset, "today's games" definition) is separate — see `backend/CLAUDE.md`.

---

## API Client

Use **axios**. Centralize all backend calls in `lib/api.ts` — never call axios directly in components.

```ts
// lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

// Attach Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) config.headers.Authorization = `Bearer ${session.access_token}`;
  return config;
});

// Handle error codes globally
// Note: lib/api.ts may be imported in SSR (Server Components, Route Handlers).
// Guard all browser APIs with typeof window !== "undefined" to avoid
// "ReferenceError: window is not defined" in Node.js.
api.interceptors.response.use(null, (error) => {
  const code = error.response?.data?.code;
  if (code === "PRO_REQUIRED" && typeof window !== "undefined") {
    const locale = window.location.pathname.split("/")[1] || "ja";
    window.location.href = `/${locale}/billing`;
  }
  if (code === "LIMIT_EXCEEDED") { /* show upgrade prompt inline */ }
  // X-AI-Remaining: warn Pro users when fewer than 10 daily AI calls remain
  const remaining = error.response?.headers?.["x-ai-remaining"];
  if (remaining !== undefined && typeof window !== "undefined") {
    // dispatch a custom event; UI components listen and show a warning banner
    window.dispatchEvent(new CustomEvent("ai-remaining", { detail: Number(remaining) }));
  }
  return Promise.reject(error);
});
```

- Base URL: `NEXT_PUBLIC_API_BASE_URL` env var
- Auth token: Supabase client `supabase.auth.getSession()`

---

## Directory Structure

```
app/
└── [locale]/
    ├── loading.tsx            # global skeleton
    ├── error.tsx              # global error boundary
    ├── page.tsx               # Home
    ├── login/page.tsx
    ├── signup/page.tsx
    ├── players/
    │   ├── loading.tsx
    │   ├── page.tsx           # Player list
    │   └── [id]/
    │       ├── loading.tsx
    │       └── page.tsx       # Player detail + AI chat
    ├── rankings/page.tsx
    ├── search/page.tsx
    ├── games/[id]/page.tsx
    ├── billing/page.tsx
    └── settings/page.tsx
```
