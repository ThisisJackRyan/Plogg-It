-- Backfill user_stats for any pre-existing profiles that missed the trigger.
-- Also aggregates any point_ledger rows that were recorded but never tallied 
-- for users who had no user_stats row at the time of the ledger insert.

insert into public.user_stats (id, total_points, current_streak, longest_streak, last_active_year_week)
select 
    p.id,
    coalesce(
        (select sum(amount) from public.point_ledger pl where pl.user_id = p.id), 
        0
    ) as total_points,
    -- We'll start their streak at 1 if they have ANY ledger activity this week, else 0.
    case 
        when exists (
            select 1 from public.point_ledger pl 
            where pl.user_id = p.id 
              and to_char(pl.created_at, 'IYYY-IW') = to_char(now(), 'IYYY-IW')
        ) then 1
        else 0
    end as current_streak,
    -- If they had activity this week, longest streak is at least 1.
    case 
        when exists (
            select 1 from public.point_ledger pl 
            where pl.user_id = p.id 
              and to_char(pl.created_at, 'IYYY-IW') = to_char(now(), 'IYYY-IW')
        ) then 1
        else 0
    end as longest_streak,
    -- Set their last active week to the most recent ledger activity week.
    (select max(to_char(created_at, 'IYYY-IW')) from public.point_ledger pl where pl.user_id = p.id) as last_active_year_week
from public.profiles p
on conflict (id) do update set
    total_points = excluded.total_points,
    current_streak = excluded.current_streak,
    longest_streak = excluded.longest_streak,
    last_active_year_week = excluded.last_active_year_week;
