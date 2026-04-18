-- Ensure authenticated/anon roles have base privileges for points tables.
-- RLS policies still enforce row-level access.

grant select on public.user_stats to anon, authenticated;
grant update on public.user_stats to authenticated;

grant select on public.point_ledger to authenticated;
