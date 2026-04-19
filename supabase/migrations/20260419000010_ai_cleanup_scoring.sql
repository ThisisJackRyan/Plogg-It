-- AI-based cleanup scoring: shadow-mode columns.
-- Keeps the existing flat-20 award trigger (award_hotspot_cleanup_points) in place.
-- A follow-up migration will remove that trigger once we cut over from shadow mode
-- to awarding the AI-computed amount directly via the API route.

alter table public.hotspots
    add column if not exists cleanup_score jsonb,
    add column if not exists cleanup_points integer;

alter table public.point_ledger
    add column if not exists metadata jsonb;
