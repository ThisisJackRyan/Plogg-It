# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Plogg It — map-based community trash reporting. Users drop pins on a map to report trash "hotspots" and mark them cleaned up. Next.js web app backed by Supabase (DB + storage) with Clerk as the identity provider via Supabase's Third-Party Auth integration.

## Commands

Package manager is **npm** (Node >=20). The Next.js app lives at the repo root; shared code is in `packages/*` as npm workspaces.

```bash
npm run dev        # next dev --turbopack
npm run build      # next build
npm run start      # next start
npm run lint       # next lint
npm run typecheck  # tsc --noEmit at root + all workspace packages
npm run format     # prettier write
```

Supabase migrations live in `supabase/migrations/` and run via the Supabase CLI (`supabase db push` / `supabase migration new`).

## Architecture

### Layout

- Root — Next.js 15 App Router, React 19, Tailwind v4, Mapbox GL via `react-map-gl`. `app/`, `components/`, `lib/`, `middleware.ts`, etc.
- `packages/types` — shared TS types incl. generated Supabase `Database` type (`database.generated.ts`) and domain types (`hotspot`, `profile`).
- `packages/supabase` — shared Supabase client factory (`createPloggClient`), typed queries (`queries/hotspots`, `queries/storage`), and React Query hooks (`hooks/useHotspots`).
- `packages/core` — platform-agnostic helpers (`geo`, `photo`).
- `packages/config` — shared TS configs only.

Packages are consumed via npm workspaces (`"*"` ranges). Prefer adding reusable logic to `packages/core` or `packages/supabase` rather than inlining in the app.

### Auth model (important)

Auth is **Clerk**, not Supabase Auth. Supabase is configured for Third-Party Auth: `createPloggClient` accepts an `accessToken` async function that returns a Clerk JWT; supabase-js attaches it as `Authorization` on every request and does not manage its own session. RLS policies in `supabase/migrations` read the Clerk user ID from the JWT. When writing queries or new client wiring, do not call Supabase Auth APIs (`signIn`, `signUp`, session listeners) — route identity through Clerk and pass the token provider into the shared client factory.

The browser/server client factories live in `lib/supabase/{browser,server}.ts`.

### Data model

Core entity is `hotspot` (a geotagged trash report with photo + status). The `cleanup` flow (see `20260418000003_cleanup.sql` and `app/cleanup`) lets users mark hotspots as cleaned. Profiles are backfilled from Clerk (`20260418000003_backfill_profiles.sql`, `20260418000004_clerk.sql`).

### Env vars

See `.env.example`. A single `.env.local` at the repo root covers the app. Client-side vars use the `NEXT_PUBLIC_` prefix. Only the Supabase/Mapbox/Clerk publishable keys are public; `CLERK_SECRET_KEY` is server-only.

### Conventions

- Prettier is the only formatter; ESLint is `next lint`.
- React 19 is pinned via npm `overrides` — don't downgrade `@types/react`.
- Generated Supabase types live in `packages/types/src/database.generated.ts` — regenerate after schema changes rather than editing by hand.
