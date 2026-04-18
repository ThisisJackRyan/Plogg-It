# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Plogg It — map-based community trash reporting. Users drop pins on a map to report trash "hotspots" and mark them cleaned up. Next.js web + Expo mobile sharing logic through workspace packages, backed by Supabase (DB + storage) with Clerk as the identity provider via Supabase's Third-Party Auth integration.

## Commands

Package manager is **pnpm@9.6.0** (required). Node >=20. Turborepo orchestrates tasks.

```bash
pnpm dev              # run all apps
pnpm dev:web          # Next.js only (turbopack)
pnpm dev:mobile       # Expo only
pnpm build            # build everything
pnpm lint             # turbo lint across workspace
pnpm typecheck        # tsc --noEmit across workspace
pnpm format           # prettier write
```

Per-app commands (run from `apps/web` or `apps/mobile`): `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`. Mobile also has `pnpm ios` / `pnpm android`. No test runner is configured yet.

Supabase migrations live in `supabase/migrations/` and run via the Supabase CLI (`supabase db push` / `supabase migration new`).

## Architecture

### Monorepo layout

- `apps/web` — Next.js 15 App Router, React 19, Tailwind v4, Mapbox GL via `react-map-gl`.
- `apps/mobile` — Expo SDK 52 + expo-router, React Native 0.76, `@rnmapbox/maps`.
- `packages/types` — shared TS types incl. generated Supabase `Database` type (`database.generated.ts`) and domain types (`hotspot`, `profile`).
- `packages/supabase` — shared Supabase client factory (`createPloggClient`), typed queries (`queries/hotspots`, `queries/storage`), and React Query hooks (`hooks/useHotspots`).
- `packages/core` — platform-agnostic helpers (`geo`, `photo`).
- `packages/config` — shared TS configs only.

All shared packages are consumed as `workspace:*`. Prefer adding cross-platform logic to `packages/core` or `packages/supabase` rather than duplicating between web and mobile.

### Auth model (important)

Auth is **Clerk**, not Supabase Auth. Supabase is configured for Third-Party Auth: `createPloggClient` accepts an `accessToken` async function that returns a Clerk JWT; supabase-js attaches it as `Authorization` on every request and does not manage its own session. RLS policies in `supabase/migrations` read the Clerk user ID from the JWT. When writing queries or new client wiring, do not call Supabase Auth APIs (`signIn`, `signUp`, session listeners) — route identity through Clerk and pass the token provider into the shared client factory.

Web instantiates the client in `apps/web/lib/supabase/{browser,server}.ts`; mobile in `apps/mobile/lib/supabase.ts` with `expo-secure-store` via `lib/token-cache.ts`.

### Data model

Core entity is `hotspot` (a geotagged trash report with photo + status). The `cleanup` flow (see `20260418000003_cleanup.sql` and `apps/web/app/cleanup`) lets users mark hotspots as cleaned. Profiles are backfilled from Clerk (`20260418000003_backfill_profiles.sql`, `20260418000004_clerk.sql`).

### Env vars

See `.env.example`. Keys are duplicated with `NEXT_PUBLIC_` (web) and `EXPO_PUBLIC_` (mobile) prefixes — when adding a new client-side env var, add both. Only the Supabase/Mapbox/Clerk publishable keys are public; `CLERK_SECRET_KEY` is server-only.

### Conventions

- Prettier is the only formatter; ESLint is per-app (`next lint`, `expo lint`).
- React 19 is pinned via pnpm overrides — don't downgrade `@types/react`.
- Generated Supabase types live in `packages/types/src/database.generated.ts` — regenerate after schema changes rather than editing by hand.
