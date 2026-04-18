-- Plogg It — cleanup flow
-- Adds cleaner attribution columns to hotspots, widens read RLS to include
-- 'cleaned' rows, and ships a security-definer RPC that marks a pin cleaned
-- atomically (anyone authed can clean any active pin, provided they supply
-- a proof photo). The view and bbox RPC are replaced to surface the new
-- fields plus an optional status filter.
--
-- Note: this project uses Clerk third-party auth, so profile ids are TEXT
-- (`user_…`) and the caller is read from `auth.jwt()->>'sub'`, not
-- `auth.uid()`.

------------------------------------------------------------------
-- Columns
------------------------------------------------------------------
alter table public.hotspots
  add column if not exists cleaned_by         text references public.profiles(id) on delete set null,
  add column if not exists cleaned_at         timestamptz,
  add column if not exists cleanup_photo_url  text;

create index if not exists hotspots_cleaned_by_idx
  on public.hotspots (cleaned_by);

------------------------------------------------------------------
-- RLS: reads cover both active and cleaned
------------------------------------------------------------------
drop policy if exists "hotspots read active"             on public.hotspots;
drop policy if exists "hotspots read active or cleaned"  on public.hotspots;

create policy "hotspots read active or cleaned"
  on public.hotspots for select
  using (status in ('active','cleaned'));

------------------------------------------------------------------
-- View: include cleanup fields, stop filtering by status
------------------------------------------------------------------
drop view if exists public.hotspots_public;

create view public.hotspots_public as
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
  h.created_at,
  h.cleaned_by,
  c.display_name              as cleaner_display_name,
  h.cleaned_at,
  h.cleanup_photo_url
from public.hotspots h
left join public.profiles p on p.id = h.reported_by
left join public.profiles c on c.id = h.cleaned_by
where h.status in ('active','cleaned');

grant select on public.hotspots_public to anon, authenticated;

------------------------------------------------------------------
-- RPC: hotspots_in_bbox (new signature — drop the old one first)
------------------------------------------------------------------
drop function if exists public.hotspots_in_bbox(double precision, double precision, double precision, double precision);

create or replace function public.hotspots_in_bbox(
  min_lng        double precision,
  min_lat        double precision,
  max_lng        double precision,
  max_lat        double precision,
  status_filter  text default null  -- null = active+cleaned, else 'active' or 'cleaned'
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
  created_at             timestamptz,
  cleaned_by             text,
  cleaner_display_name   text,
  cleaned_at             timestamptz,
  cleanup_photo_url      text
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
    h.created_at,
    h.cleaned_by,
    c.display_name,
    h.cleaned_at,
    h.cleanup_photo_url
  from public.hotspots h
  left join public.profiles p on p.id = h.reported_by
  left join public.profiles c on c.id = h.cleaned_by
  where h.location && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
    and (
      case
        when status_filter is null then h.status in ('active','cleaned')
        else h.status = status_filter
      end
    )
  order by h.created_at desc
  limit 500;
$$;

grant execute on function public.hotspots_in_bbox(double precision, double precision, double precision, double precision, text)
  to anon, authenticated;

------------------------------------------------------------------
-- RPC: cleanup_hotspot — any authed user can mark an active pin cleaned,
-- provided they supply a cleanup photo URL. Security definer so the
-- non-author can update a row their RLS wouldn't otherwise permit.
------------------------------------------------------------------
create or replace function public.cleanup_hotspot(
  hotspot_id           uuid,
  cleanup_photo_url    text,
  cleaner_display_name text default null
)
returns setof public.hotspots_public
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller     text := auth.jwt()->>'sub';
  updated_id uuid;
begin
  if caller is null or length(caller) = 0 then
    raise exception 'not authenticated';
  end if;
  if cleanup_photo_url is null or length(cleanup_photo_url) = 0 then
    raise exception 'cleanup_photo_url is required';
  end if;

  -- Defensive profile upsert (mirrors insert_hotspot flow).
  insert into public.profiles (id, display_name)
  values (caller, cleaner_display_name)
  on conflict (id) do nothing;

  update public.hotspots h
  set status            = 'cleaned',
      cleaned_by        = caller,
      cleaned_at        = now(),
      cleanup_photo_url = cleanup_hotspot.cleanup_photo_url
  where h.id = hotspot_id
    and h.status = 'active'
  returning h.id into updated_id;

  if updated_id is null then
    raise exception 'hotspot not found or already cleaned';
  end if;

  return query select * from public.hotspots_public where id = updated_id;
end;
$$;

grant execute on function public.cleanup_hotspot(uuid, text, text) to authenticated;
