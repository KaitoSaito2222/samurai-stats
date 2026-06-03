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

- Login and signup use **custom forms** (Tailwind-styled) — do NOT use `@supabase/auth-ui-react`
- **Providers**: Google OAuth + email/password only
- **Email confirmation**: handled by Supabase Auth + Resend (configured in Supabase dashboard as email provider). Code calls `supabase.auth.signUp()` — no Resend SDK in frontend code.
- **OAuth callback**: `app/auth/callback/route.ts` exchanges the OAuth code for a session, then redirects to `?next=` param (defaults to `/ja`)
- After email/password login, `onAuthStateChange` fires `SIGNED_IN` and redirects to `redirectTo` query param or `/[locale]`
- Session is managed by Supabase client; `lib/api.ts` attaches the JWT automatically
- Protect routes via `middleware.ts`: unauthenticated access to non-public pages redirects to `/[locale]/login`

**Public routes** (no auth required): `/login`, `/signup`, `/`, `/players`, `/players/[id]`, `/rankings`, `/games/[id]`

**Auth-required routes**: `/search`, `/billing`, `/settings`

---

## Design System — "Bushido Data Light"

A premium **editorial / modern-newspaper** aesthetic that bridges traditional
Japanese craft with elite sports journalism. The emotional target is *"Informed
Authority"* — feeling like a subscriber to a private intelligence service.
Prioritize legibility, structural grids, and expansive whitespace over
decorative flair.

> Configure in `tailwind.config.ts`. All components must use these tokens — no raw hex values in JSX.

### Colors

Anchored by **Deep Navy** (authority/structure) with a **Gold** accent used
*sparingly* for high-value actions, active states, and "kintsugi-style"
dividers. Navy is the lead; gold is the accent. **MLB red is retired** — red is
reserved for error states only.

```ts
colors: {
  navy:  { DEFAULT: "#031427", dark: "#0B1C30" },  // primary text, headers, table heads, primary CTA
  gold:  { DEFAULT: "#D4A843", dark: "#B5912F" },  // accent: active states, dividers, secondary CTA
  ink:   { DEFAULT: "#191C1D", muted: "#44474C" }, // body text / muted body text
  surface: {
    DEFAULT: "#F8F9FA",  // page background (light grey)
    card:    "#FFFFFF",  // card / container background
    border:  "#E5E7EB",  // hairline dividers (1px)
    muted:   "#F3F4F5",  // zebra rows, data-heavy containers
    outline: "#C4C6CD",  // stronger outline when more separation is needed
  },
  // Back-compat aliases (legacy components): brand → navy, pro → gold.
  brand: { DEFAULT: "#031427", dark: "#0B1C30" },
  pro:   "#D4A843",
}
```

### Typography

A **dual-serif editorial identity** plus a utility sans for data:

```ts
fontFamily: {
  display: ["Playfair Display", "serif"],   // headlines — high-contrast, print-like
  serif:   ["Noto Serif JP", "serif"],       // body copy + Japanese (default body font)
  sans:    ["Inter", "sans-serif"],          // labels, data tables, micro-copy
}
```

- **Playfair Display** (`font-display`): all headlines (player names, section titles, big stat numbers).
- **Noto Serif JP** (`font-serif`): narrative/body copy and Japanese text — the **default `<body>` font**.
- **Inter** (`font-sans`): labels, numeric data tables, captions. Labels are **UPPERCASE with `tracking-wide`** (`0.05em`) to separate data from narrative.

### Shapes & Elevation

- **Disciplined corners**: `rounded` (0.125rem) for cards/containers, `rounded-lg` (0.25rem) for buttons/inputs/chips. **Avoid pill shapes** (`rounded-full`) — they read as "playful app" and break the serious editorial tone. Player photos may use a subtle `rounded` square, not a circle.
- **Avoid heavy shadows.** Signal depth with **1px hairline borders** (`border-surface-border`) and tonal layers (white → `surface-muted`). Floating elements may use one soft diffused navy shadow: `shadow-[0_4px_20px_rgba(3,20,39,0.10)]`.
- Use **gold or navy fine-line dividers** (0.5–1px) to structure content like a high-end newspaper.

### Components

- **Primary button**: `bg-navy text-white rounded-lg` — no shadow.
- **Secondary button**: `bg-gold text-navy rounded-lg` — high-importance "call to insight".
- **Ghost button**: transparent with `border border-navy text-navy`.
- **Data tables**: navy header row (`bg-navy text-white`, Inter uppercase label), zebra rows (`bg-surface-card` / `bg-surface-muted`), 1px bottom borders; highlight totals/marquee rows with `bg-gold/10` + gold bottom border, bold.
- **AI analysis cards**: white surface with a **4px gold left border-accent**; narrative in Noto Serif. Place a gold uppercase kicker label above the headline.
- **Kicker pattern**: small gold UPPERCASE Inter label, optionally followed by a `h-px w-12 bg-gold` dash, above Playfair headlines.
- **Section heading**: Inter uppercase label with a `border-b-2 border-gold` underline, OR a Playfair headline — not a colored accent bar.
- **Input fields**: white with 1px navy border; focus → 2px border + subtle gold ring.

### Layout

Centered max-width **1280px**, 12-column feel with generous 24px (`gap-6`)
gutters. Use asymmetric layouts on player/detail pages (e.g. 8-col main + 4-col
sidebar). Major thematic sections separated by large vertical space
(`space-y-12`+).

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
- `< 5 PA` or null → `bg-slate-200` (insufficient sample)
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
