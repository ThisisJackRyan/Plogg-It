-- Plogg It — initial schema
-- Extensions, tables, indexes, RLS, RPC, and the auth trigger that
-- auto-creates a profile row. Storage bucket policies live in the
-- follow-up migration (20260418000002_storage.sql).

------------------------------------------------------------------
-- Extensions
------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "postgis";

------------------------------------------------------------------
-- profiles (1:1 with auth.users)
------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles read all"     on public.profiles;
drop policy if exists "profiles insert self"  on public.profiles;
drop policy if exists "profiles update self"  on public.profiles;

create policy "profiles read all"
  on public.profiles for select
  using (true);

create policy "profiles insert self"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles update self"
  on public.profiles for update
  using (id = auth.uid());

------------------------------------------------------------------
-- hotspots (a pin on the map)
------------------------------------------------------------------
create table if not exists public.hotspots (
  id           uuid primary key default gen_random_uuid(),
  reported_by  uuid not null references public.profiles(id) on delete cascade,
  location     geography(Point, 4326) not null,
  description  text not null check (char_length(description) between 1 and 500),
  difficulty   smallint not null check (difficulty between 1 and 5),
  photo_url    text not null,
  status       text not null default 'active' check (status in ('active','cleaned','archived')),
  created_at   timestamptz not null default now()
);

create index if not exists hotspots_location_gix
  on public.hotspots using gist (location);
create index if not exists hotspots_status_created_idx
  on public.hotspots (status, created_at desc);
create index if not exists hotspots_reported_by_idx
  on public.hotspots (reported_by);

alter table public.hotspots enable row level security;

drop policy if exists "hotspots read active"   on public.hotspots;
drop policy if exists "hotspots insert authed" on public.hotspots;
drop policy if exists "hotspots update author" on public.hotspots;
drop policy if exists "hotspots delete author" on public.hotspots;

create policy "hotspots read active"
  on public.hotspots for select
  using (status = 'active');

create policy "hotspots insert authed"
  on public.hotspots for insert
  with check (auth.uid() = reported_by);

create policy "hotspots update author"
  on public.hotspots for update
  using (auth.uid() = reported_by);

create policy "hotspots delete author"
  on public.hotspots for delete
  using (auth.uid() = reported_by);

------------------------------------------------------------------
-- View: hotspots_public (flattened lat/lng, joined reporter name)
------------------------------------------------------------------
create or replace view public.hotspots_public as
select
  h.id,
  h.reported_by,
  p.display_name              as reporter_display_name,
  h.description,
  h.difficulty,
  h.photo_url,
  h.status,
  ST_Y(h.location::geometry)  as lat,
  ST_X(h.location::geometry)  as lng,
  h.created_at
from public.hotspots h
left join public.profiles p on p.id = h.reported_by
where h.status = 'active';

-- Views in Supabase respect the RLS of their underlying tables.
grant select on public.hotspots_public to anon, authenticated;

------------------------------------------------------------------
-- RPC: hotspots_in_bbox (used by the map viewport query)
------------------------------------------------------------------
create or replace function public.hotspots_in_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision
)
returns table (
  id                     uuid,
  reported_by            uuid,
  reporter_display_name  text,
  description            text,
  difficulty             smallint,
  photo_url              text,
  status                 text,
  lat                    double precision,
  lng                    double precision,
  created_at             timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    h.id,
    h.reported_by,
    p.display_name,
    h.description,
    h.difficulty,
    h.photo_url,
    h.status,
    ST_Y(h.location::geometry)::double precision as lat,
    ST_X(h.location::geometry)::double precision as lng,
    h.created_at
  from public.hotspots h
  left join public.profiles p on p.id = h.reported_by
  where h.status = 'active'
    and h.location && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
  order by h.created_at desc
  limit 500;
$$;

grant execute on function public.hotspots_in_bbox(double precision, double precision, double precision, double precision)
  to anon, authenticated;

------------------------------------------------------------------
-- Auth trigger: auto-create a profile row on new auth.users
------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
