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

### Supabase migration rules (read before touching `supabase/`)

`supabase db push` has been failing because migrations get written that conflict with remote state, forcing manual fixes in the SQL editor — which then creates drift. Follow these rules to prevent that:

1. **Never edit an existing migration file.** Once a migration is in `supabase/migrations/`, treat it as immutable — it may already be applied remotely. Always create a new one with `supabase migration new <descriptive_name>`.
2. **Before writing a new migration, read every existing file in `supabase/migrations/`** to understand current schema state. Do not assume a clean slate. Check for: existing tables/columns with the same name, existing RLS policies, existing indexes, existing functions/triggers.
3. **Run `supabase db diff` before `supabase db push`** to preview exactly what will run against remote. If the diff contains anything unexpected, stop and investigate — do not push.
4. **If remote drift is suspected** (prior SQL-editor fixes, failed pushes), run `supabase db pull` first to capture remote state as a new migration, then reconcile locally before adding more changes.
5. **Write idempotent DDL where reasonable**: `create table if not exists`, `create index if not exists`, `drop policy if exists ... ; create policy ...`. This makes re-runs and partial-apply recovery survivable.
6. **Wrap multi-statement migrations so they succeed or fail as a unit.** Don't mix DDL that can't be rolled back (e.g. `create type`) with DML in the same file without thinking about re-run behavior.
7. **After schema changes land, regenerate types** (`packages/types/src/database.generated.ts`) in the same PR — don't hand-edit.
8. **Never run destructive SQL** (`drop table`, `drop column`, `truncate`) without explicit user confirmation, even in migrations.
9. **If `supabase db push` fails, do not fix it by editing the remote via the SQL editor.** Report the error, propose a new corrective migration, and get user sign-off before applying.
