-- Routes: GPS-tracked plogging sessions.
-- route_waypoints: streaming GPS fixes appended during a session.
-- route_hotspots: hotspots reported during a session.
-- start_route RPC: creates the session row, discards dangling active sessions.
-- finalize_route RPC: materialises the LINESTRING and computes ST_Length.

--------------------------------------------------------------------
-- routes
--------------------------------------------------------------------
create table if not exists public.routes (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null references public.profiles(id) on delete cascade,
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  total_distance_m double precision,
  path             geography(LineString, 4326),
  hotspot_count    int not null default 0,
  status           text not null default 'active'
                     check (status in ('active', 'completed', 'discarded'))
);

create index if not exists routes_user_id_idx on public.routes (user_id, started_at desc);
create index if not exists routes_path_gix    on public.routes using gist (path);

alter table public.routes enable row level security;

create policy "routes owner select"
  on public.routes for select
  using (user_id = (auth.jwt()->>'sub'));

create policy "routes owner insert"
  on public.routes for insert
  with check (user_id = (auth.jwt()->>'sub'));

create policy "routes owner update"
  on public.routes for update
  using (user_id = (auth.jwt()->>'sub'));

create policy "routes owner delete"
  on public.routes for delete
  using (user_id = (auth.jwt()->>'sub'));

--------------------------------------------------------------------
-- route_waypoints
--------------------------------------------------------------------
create table if not exists public.route_waypoints (
  id          bigint primary key generated always as identity,
  route_id    uuid not null references public.routes(id) on delete cascade,
  location    geography(Point, 4326) not null,
  recorded_at timestamptz not null default now(),
  accuracy_m  float4
);

create index if not exists route_waypoints_route_id_idx
  on public.route_waypoints (route_id, recorded_at);
create index if not exists route_waypoints_location_gix
  on public.route_waypoints using gist (location);

alter table public.route_waypoints enable row level security;

create policy "route_waypoints owner select"
  on public.route_waypoints for select
  using (
    exists (
      select 1 from public.routes r
      where r.id = route_waypoints.route_id
        and r.user_id = (auth.jwt()->>'sub')
    )
  );

create policy "route_waypoints owner insert"
  on public.route_waypoints for insert
  with check (
    exists (
      select 1 from public.routes r
      where r.id = route_waypoints.route_id
        and r.user_id = (auth.jwt()->>'sub')
    )
  );

create policy "route_waypoints owner delete"
  on public.route_waypoints for delete
  using (
    exists (
      select 1 from public.routes r
      where r.id = route_waypoints.route_id
        and r.user_id = (auth.jwt()->>'sub')
    )
  );

--------------------------------------------------------------------
-- route_hotspots
--------------------------------------------------------------------
create table if not exists public.route_hotspots (
  route_id    uuid not null references public.routes(id) on delete cascade,
  hotspot_id  uuid not null references public.hotspots(id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (route_id, hotspot_id)
);

create index if not exists route_hotspots_route_id_idx on public.route_hotspots (route_id);

alter table public.route_hotspots enable row level security;

create policy "route_hotspots owner select"
  on public.route_hotspots for select
  using (
    exists (
      select 1 from public.routes r
      where r.id = route_hotspots.route_id
        and r.user_id = (auth.jwt()->>'sub')
    )
  );

create policy "route_hotspots owner insert"
  on public.route_hotspots for insert
  with check (
    exists (
      select 1 from public.routes r
      where r.id = route_hotspots.route_id
        and r.user_id = (auth.jwt()->>'sub')
    )
  );

--------------------------------------------------------------------
-- RPC: start_route
--------------------------------------------------------------------
create or replace function public.start_route()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller  text := auth.jwt()->>'sub';
  new_id  uuid;
begin
  if caller is null or length(caller) = 0 then
    raise exception 'not authenticated';
  end if;

  -- Discard any dangling active session from a previous interrupted run.
  update public.routes
  set status = 'discarded'
  where user_id = caller and status = 'active';

  insert into public.profiles (id) values (caller)
  on conflict (id) do nothing;

  insert into public.routes (user_id)
  values (caller)
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.start_route() to authenticated;

--------------------------------------------------------------------
-- RPC: finalize_route
--------------------------------------------------------------------
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
    update public.routes
    set status           = 'completed',
        ended_at         = now(),
        total_distance_m = 0,
        hotspot_count    = (
          select count(*) from public.route_hotspots rh
          where rh.route_id = p_route_id
        )
    where id = p_route_id;
  else
    update public.routes
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
    where id = p_route_id;
  end if;

  return query
    select r.id, r.started_at, r.ended_at, r.total_distance_m, r.hotspot_count, r.status
    from public.routes r
    where r.id = p_route_id;
end;
$$;

grant execute on function public.finalize_route(uuid) to authenticated;
