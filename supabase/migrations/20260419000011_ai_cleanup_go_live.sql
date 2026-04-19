-- Go-live for AI-scored cleanup points.
-- Drops the flat-20 cleanup trigger and adds a security-definer RPC that the
-- API route calls to write the dynamic, AI-scored amount into point_ledger.

drop trigger if exists after_hotspot_update_points on public.hotspots;
drop function if exists public.award_hotspot_cleanup_points();

create or replace function public.award_cleanup_points(
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
    v_cleaned_by text;
    v_ledger_id uuid;
begin
    v_user_id := auth.jwt()->>'sub';
    if v_user_id is null then
        raise exception 'not_authenticated';
    end if;

    if p_points < 0 or p_points > 200 then
        raise exception 'invalid_points';
    end if;

    select cleaned_by into v_cleaned_by
    from public.hotspots
    where id = p_hotspot_id;

    if v_cleaned_by is null or v_cleaned_by <> v_user_id then
        raise exception 'not_cleaner';
    end if;

    if exists (
        select 1 from public.point_ledger
        where user_id = v_user_id
          and reason = 'hotspot_cleaned'
          and reference_id = p_hotspot_id
    ) then
        raise exception 'already_awarded';
    end if;

    insert into public.point_ledger (user_id, amount, reason, reference_id, metadata)
    values (v_user_id, p_points, 'hotspot_cleaned', p_hotspot_id, p_metadata)
    returning id into v_ledger_id;

    return v_ledger_id;
end;
$$;

grant execute on function public.award_cleanup_points(uuid, integer, jsonb) to authenticated;
