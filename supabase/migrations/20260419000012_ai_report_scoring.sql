-- AI-scored report points (25% of estimated cleanup reward, capped at 50).
-- Replaces the flat-10 report trigger with an API-awarded amount.

drop trigger if exists after_hotspot_insert_points on public.hotspots;
drop function if exists public.award_hotspot_report_points();

alter table public.hotspots
    add column if not exists report_score jsonb,
    add column if not exists report_points integer;

create or replace function public.award_report_points(
    p_hotspot_id uuid,
    p_points integer,
    p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id text;
    v_reported_by text;
    v_ledger_id uuid;
begin
    v_user_id := auth.jwt()->>'sub';
    if v_user_id is null then
        raise exception 'not_authenticated';
    end if;

    if p_points < 0 or p_points > 50 then
        raise exception 'invalid_points';
    end if;

    select reported_by into v_reported_by
    from public.hotspots
    where id = p_hotspot_id;

    if v_reported_by is null or v_reported_by <> v_user_id then
        raise exception 'not_reporter';
    end if;

    if exists (
        select 1 from public.point_ledger
        where user_id = v_user_id
          and reason = 'hotspot_reported'
          and reference_id = p_hotspot_id
    ) then
        raise exception 'already_awarded';
    end if;

    insert into public.point_ledger (user_id, amount, reason, reference_id, metadata)
    values (v_user_id, p_points, 'hotspot_reported', p_hotspot_id, p_metadata)
    returning id into v_ledger_id;

    return v_ledger_id;
end;
$$;

grant execute on function public.award_report_points(uuid, integer, jsonb) to authenticated;
