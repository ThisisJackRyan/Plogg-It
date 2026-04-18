# Plogged — Detailed Build Plan

A gamified litter-cleanup PWA. Map → cleanup → AI verify → points → Pokédex. Built as a static-exported Next.js SPA so it can be wrapped in Capacitor later.

## 0. Decisions to lock in hour 0

- **Name**: Plogged (placeholder until confirmed)
- **Demo city/neighborhood**: TBD — affects seed hotspots and field-test location
- **Team split (3 people)**: (a) Frontend + map + PWA, (b) Supabase schema + auth + RLS, (c) Claude Edge Function + Pokédex/points logic
- **Design language**: Tailwind + shadcn/ui, mobile-first, single-column layouts, bottom tab nav

## 1. Architecture (Capacitor-safe)

Everything client-side, one static bundle, one server-side function.

```
┌──────────────────────────┐
│  Next.js (static export) │ ← hosted on Vercel; wraps into Capacitor later
│  - SPA routing           │
│  - Service worker (PWA)  │
└────────────┬─────────────┘
             │ direct (anon key)
             ▼
┌──────────────────────────┐       ┌────────────────────────────┐
│  Supabase                │       │  Supabase Edge Function    │
│  - Auth (magic link)     │◄──────┤  verify-cleanup            │
│  - Postgres + PostGIS    │       │    calls Claude vision API │
│  - Storage (photos)      │       │    returns structured JSON │
│  - Realtime (stretch)    │       └────────────────────────────┘
└──────────────────────────┘
```

Hard rules:
- `output: 'export'` in `next.config.ts`
- No server components, no API routes, no middleware
- All client components (`"use client"` at top of any interactive page)
- Relative asset paths only
- Env secrets live in Edge Function, never shipped to browser

## 2. Repository layout (target)

```
plogg-it/
├── PLAN.md                       ← this file
├── next.config.ts                ← output: 'export', images.unoptimized
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── package.json
├── public/
│   ├── manifest.webmanifest
│   ├── icon-192.png, icon-512.png
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── layout.tsx            ← root shell + PWA metadata
│   │   ├── page.tsx              ← landing / redirect to /map
│   │   ├── map/page.tsx
│   │   ├── hotspot/[id]/page.tsx
│   │   ├── cleanup/new/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── leaderboard/page.tsx
│   │   ├── login/page.tsx
│   │   └── report/page.tsx
│   ├── components/
│   │   ├── nav/BottomTabs.tsx
│   │   ├── ui/                   ← shadcn primitives
│   │   └── map/MapView.tsx       ← placeholder until Mapbox wired
│   ├── lib/
│   │   ├── supabase.ts           ← browser client factory
│   │   ├── claude.ts             ← Edge Function invoker
│   │   └── points.ts             ← points formula
│   └── types/
│       └── db.ts                 ← generated Supabase types (later)
└── supabase/
    ├── migrations/0001_init.sql  ← PostGIS, tables, RLS (later)
    └── functions/verify-cleanup/ ← Claude call (later)
```

## 3. Phased execution

### Phase 1 — Foundation (hrs 0–6) ← **this PR**
1. `create-next-app` with TS + Tailwind + App Router
2. Convert to static export (`output: 'export'`, `images.unoptimized: true`)
3. Root layout with PWA metadata, viewport, theme color, manifest link
4. Bottom-tab shell (Map · Leaderboard · Report · Profile)
5. Placeholder pages for every route in the inventory — each renders a titled card so navigation works end-to-end
6. `public/manifest.webmanifest` with name, short_name, icons, standalone display
7. `.env.local.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN` (unused until phase 2)

Done when: `npm run dev` renders all 8 routes; `npm run build` produces a clean `out/` static bundle.

### Phase 2 — Supabase + map (hrs 6–12)
- Create Supabase project; run `0001_init.sql` (profiles, hotspots, cleanups, trash_finds, PostGIS, RLS)
- Magic-link auth at `/login` → writes row into `profiles`
- Supabase browser client (`src/lib/supabase.ts`)
- Mapbox GL via `react-map-gl`, user geolocation, pins from `hotspots` table
- Seed 5–10 fake hotspots in demo neighborhood

### Phase 3 — Cleanup loop (hrs 12–20)
- `/cleanup/new`: before photo → after photo (uses `<input capture>` fallback for iOS)
- Client-side compression (`browser-image-compression`) before upload to Supabase Storage
- Edge Function `verify-cleanup`: receives two signed URLs, calls Claude vision, returns verdict JSON
- Cap `points_suggested` server-side, persist to `cleanups`, fan out `trash_finds` rows
- Results screen with verdict + points + detected items

### Phase 4 — Progression (hrs 20–28)
- `/profile`: total points, counts, recent cleanups
- Pokédex grid (group `trash_finds` by category, show rarity tier)
- `/leaderboard` (global, ordered by `profiles.total_points`)
- `/report` flow: drop pin, upload photo, insert `hotspots` row

### Phase 5 — PWA polish (hrs 28–34)
- Install `@serwist/next`, register service worker
- Icons 192 / 512 / maskable
- Offline fallback page
- Real-device test on iOS + Android (camera, geolocation, add-to-home-screen)

### Phase 6 — One stretch (hrs 34–40)
Pick ONE and ship: live activity feed (Realtime), neighborhood cleanliness score, or AI report card.

### Phase 7 — Field + demo (hrs 40–46)
- 3–5 real cleanups to seed authentic data
- Record backup demo video
- Write + rehearse pitch

### Phase 8 — Buffer (hrs 46–48)
Bug fixes only. No new features.

## 4. Data model (recap for quick reference)

- `profiles(id, display_name, avatar_url, total_points, created_at)`
- `hotspots(id, location geography, description, photo_url, reported_by, status, difficulty, created_at)`
- `cleanups(id, user_id, hotspot_id?, location, before_photo_url, after_photo_url, ai_verdict jsonb, points_awarded, verified, created_at)`
- `trash_finds(id, cleanup_id, category, rarity, count)`

RLS: users can only insert/select their own rows; `hotspots` are world-readable; `profiles.total_points` updated via trigger on verified cleanups.

## 5. Points formula (server-enforced)

```
base        = min(claude.points_suggested, 100)
volumeMult  = { small: 1, medium: 1.5, large: 2 }[claude.estimated_volume]
rarityBonus = 10 * uncommonCount + 50 * rareCount
hotspotBonus= difficulty * 10   (if linked to a hotspot)
dailyBonus  = 25                 (first cleanup of the day for this user)

points = round(base * volumeMult) + rarityBonus + hotspotBonus + dailyBonus
```

## 6. Claude prompt contract

System: "You are verifying a litter cleanup…" (see source plan)
Output: strict JSON — validated with Zod before persisting. If parse fails, store raw response in `ai_verdict.raw`, mark `verified=false`, award 0 points.

## 7. Risks (watch list)

| Risk | Mitigation |
|---|---|
| Photo fakery | Acknowledge; lean on GPS + community verify in pitch |
| iOS Safari quirks | Test on real iPhone by hour 6, not hour 40 |
| Claude latency | Swap Sonnet → Haiku if p95 > 5s |
| RLS misconfig | Write policies alongside schema; test as anon from day 1 |
| Image sizes | Compress client-side before upload |
| Demo failure | Seeded data + recorded video + staging URL |

## 8. Definition of done (demo)

Judge opens URL on their phone → adds to home screen → taps icon → map loads with pins → taps pin → walks to spot (or watches video) → takes before/after → AI verifies in <10s → points awarded → leaderboard updates → Pokédex shows new item. Under 2 minutes, end to end.
