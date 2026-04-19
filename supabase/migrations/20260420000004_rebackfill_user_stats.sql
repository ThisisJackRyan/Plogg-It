-- Re-run the user_stats backfill after a manual truncate emptied the table.
-- The on_new_profile_stats trigger only fires for *new* profile inserts, so
-- existing profiles have no user_stats row, breaking the leaderboard and the
-- points marketplace balance lookup. This repopulates one row per profile,
-- sourcing totals from point_ledger (which may also be empty — that's fine).

insert into public.user_stats (id, total_points, current_streak, longest_streak, last_active_year_week)
select
    p.id,
    coalesce(
        (select sum(amount) from public.point_ledger pl where pl.user_id = p.id),
        0
    ) as total_points,
    case
        when exists (
            select 1 from public.point_ledger pl
            where pl.user_id = p.id
              and to_char(pl.created_at, 'IYYY-IW') = to_char(now(), 'IYYY-IW')
        ) then 1
        else 0
    end as current_streak,
    case
        when exists (
            select 1 from public.point_ledger pl
            where pl.user_id = p.id
              and to_char(pl.created_at, 'IYYY-IW') = to_char(now(), 'IYYY-IW')
        ) then 1
        else 0
    end as longest_streak,
    (select max(to_char(created_at, 'IYYY-IW')) from public.point_ledger pl where pl.user_id = p.id) as last_active_year_week
from public.profiles p
on conflict (id) do update set
    total_points = excluded.total_points,
    current_streak = excluded.current_streak,
    longest_streak = excluded.longest_streak,
    last_active_year_week = excluded.last_active_year_week;
