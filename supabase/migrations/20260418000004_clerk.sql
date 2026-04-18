-- Migrate auth from Supabase Auth to Clerk (Third-Party Auth integration).
-- Supabase now accepts Clerk-issued JWTs; RLS reads `auth.jwt()->>'sub'`
-- (the Clerk user id, e.g. `user_2abc…`) instead of `auth.uid()`.
--
-- Prereqs before applying:
--   1. `truncate public.profiles, public.hotspots restart identity cascade`
--      and `delete from auth.users` — we wipe since IDs are becoming TEXT.
--   2. Empty the `hotspot-photos` storage bucket via Dashboard.
--   3. In Supabase Dashboard → Authentication → Third-Party Auth, add Clerk.

------------------------------------------------------------------
-- Drop the old auth.users trigger — Supabase Auth is no longer in play.
------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

------------------------------------------------------------------
-- Drop policies + dependent view first. Postgres refuses to alter
-- the type of a column that policies or views reference.
------------------------------------------------------------------
drop policy if exists "profiles read all"     on public.profiles;
drop policy if exists "profiles insert self"  on public.profiles;
drop policy if exists "profiles update self"  on public.profiles;

drop policy if exists "hotspots read active"   on public.hotspots;
drop policy if exists "hotspots insert authed" on public.hotspots;
drop policy if exists "hotspots update author" on public.hotspots;
drop policy if exists "hotspots delete author" on public.hotspots;

drop policy if exists "hotspot-photos public read"    on storage.objects;
drop policy if exists "hotspot-photos owner insert"   on storage.objects;
drop policy if exists "hotspot-photos owner update"   on storage.objects;
drop policy if exists "hotspot-photos owner delete"   on storage.objects;

drop view if exists public.hotspots_public;
drop function if exists public.hotspots_in_bbox(double precision, double precision, double precision, double precision);

------------------------------------------------------------------
-- Rebuild profiles with TEXT id (Clerk user ids are `user_…`, not UUID).
------------------------------------------------------------------
-- hotspots.reported_by has an FK to profiles.id — drop it before altering type.
alter table public.hotspots
  drop constraint if exists hotspots_reported_by_fkey;

-- Drop the FK to auth.users(id) and change type.
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.profiles
  alter column id type text using id::text;

-- reported_by mirrors profiles.id, so it must change too.
alter table public.hotspots
  alter column reported_by type text using reported_by::text;

-- Re-create the FK now that both columns are TEXT.
alter table public.hotspots
  add constraint hotspots_reported_by_fkey
  foreign key (reported_by) references public.profiles(id) on delete cascade;

------------------------------------------------------------------
-- Re-create RLS policies with auth.jwt()->>'sub' (Clerk user id).
------------------------------------------------------------------
create policy "profiles read all"
  on public.profiles for select
  using (true);

create policy "profiles insert self"
  on public.profiles for insert
  with check (id = (auth.jwt()->>'sub'));

create policy "profiles update self"
  on public.profiles for update
  using (id = (auth.jwt()->>'sub'));

create policy "hotspots read active"
  on public.hotspots for select
  using (status = 'active');

create policy "hotspots insert authed"
  on public.hotspots for insert
  with check (reported_by = (auth.jwt()->>'sub'));

create policy "hotspots update author"
  on public.hotspots for update
  using (reported_by = (auth.jwt()->>'sub'));

create policy "hotspots delete author"
  on public.hotspots for delete
  using (reported_by = (auth.jwt()->>'sub'));

------------------------------------------------------------------
-- Storage policies: same swap, files now live under `hotspots/{clerk_user_id}/…`.
------------------------------------------------------------------
create policy "hotspot-photos public read"
  on storage.objects for select
  using (bucket_id = 'hotspot-photos');

create policy "hotspot-photos owner insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'hotspot-photos'
    and (storage.foldername(name))[1] = 'hotspots'
    and (storage.foldername(name))[2] = (auth.jwt()->>'sub')
  );

create policy "hotspot-photos owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'hotspot-photos'
    and (storage.foldername(name))[1] = 'hotspots'
    and (storage.foldername(name))[2] = (auth.jwt()->>'sub')
  );

create policy "hotspot-photos owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'hotspot-photos'
    and (storage.foldername(name))[1] = 'hotspots'
    and (storage.foldername(name))[2] = (auth.jwt()->>'sub')
  );

------------------------------------------------------------------
-- Rebuild view + RPC against the new TEXT column types.
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

grant select on public.hotspots_public to anon, authenticated;

create or replace function public.hotspots_in_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision
)
returns table (
  id                     uuid,
  reported_by            text,
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
