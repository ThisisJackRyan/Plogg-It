-- finalize_route had ambiguous `id` refs: RETURNS TABLE declares `id` as a
-- PL/pgSQL output variable, and the UPDATE used unqualified `where id = ...`
-- which also matches routes.id. Qualify the column refs in both branches.

create or replace function public.finalize_route(
  p_route_id uuid
)
returns table (
  id               uuid,
  started_at       timestamptz,
  ended_at         timestamptz,
  total_distance_m double precision,
  hotspot_count    int,
  status           text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller      text := auth.jwt()->>'sub';
  waypoint_ct int;
begin
  if not exists (
    select 1 from public.routes r
    where r.id = p_route_id and r.user_id = caller
  ) then
    raise exception 'route not found or access denied';
  end if;

  select count(*) into waypoint_ct
  from public.route_waypoints
  where route_id = p_route_id;

  if waypoint_ct < 2 then
    update public.routes r
    set status           = 'completed',
        ended_at         = now(),
        total_distance_m = 0,
        hotspot_count    = (
          select count(*) from public.route_hotspots rh
          where rh.route_id = p_route_id
        )
    where r.id = p_route_id;
  else
    update public.routes r
    set status           = 'completed',
        ended_at         = now(),
        total_distance_m = (
          select ST_Length(
            ST_MakeLine(
              array_agg(location::geometry order by recorded_at)
            )::geography
          )
          from public.route_waypoints
          where route_id = p_route_id
        ),
        path             = (
          select ST_MakeLine(
            array_agg(location::geometry order by recorded_at)
          )::geography
          from public.route_waypoints
          where route_id = p_route_id
        ),
        hotspot_count    = (
          select count(*) from public.route_hotspots rh
          where rh.route_id = p_route_id
        )
    where r.id = p_route_id;
  end if;

  return query
    select r.id, r.started_at, r.ended_at, r.total_distance_m, r.hotspot_count, r.status
    from public.routes r
    where r.id = p_route_id;
end;
$$;
