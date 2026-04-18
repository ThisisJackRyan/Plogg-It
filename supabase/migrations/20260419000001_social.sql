-- Plogg It — social layer
-- Adds usernames/bios to profiles, one-way follows, kudos, comments, and a
-- feed view + RPC that returns reports and cleanups from users the caller
-- follows. Profile ids are Clerk user ids (TEXT); caller is resolved from
-- `auth.jwt()->>'sub'`.

create extension if not exists "citext";

------------------------------------------------------------------
-- profiles: username (case-insensitive unique handle) + bio
------------------------------------------------------------------
alter table public.profiles
  add column if not exists username citext unique,
  add column if not exists bio      text check (bio is null or char_length(bio) <= 280);

-- Username format enforced at write time; CITEXT handles case-insensitivity.
alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add  constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9_]{3,20}$');

create index if not exists profiles_username_idx on public.profiles (username);

------------------------------------------------------------------
-- follows (one-way, public)
------------------------------------------------------------------
create table if not exists public.follows (
  follower_id  text not null references public.profiles(id) on delete cascade,
  followee_id  text not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index if not exists follows_followee_idx on public.follows (followee_id);
create index if not exists follows_follower_idx on public.follows (follower_id);

alter table public.follows enable row level security;

drop policy if exists "follows read all"      on public.follows;
drop policy if exists "follows insert self"   on public.follows;
drop policy if exists "follows delete self"   on public.follows;

create policy "follows read all"
  on public.follows for select
  using (true);

create policy "follows insert self"
  on public.follows for insert
  with check (follower_id = (auth.jwt()->>'sub'));

create policy "follows delete self"
  on public.follows for delete
  using (follower_id = (auth.jwt()->>'sub'));

------------------------------------------------------------------
-- kudos (one row per user per hotspot+event)
------------------------------------------------------------------
create table if not exists public.kudos (
  hotspot_id   uuid not null references public.hotspots(id) on delete cascade,
  event_type   text not null check (event_type in ('report','cleanup')),
  user_id      text not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (hotspot_id, event_type, user_id)
);

create index if not exists kudos_event_idx on public.kudos (hotspot_id, event_type);

alter table public.kudos enable row level security;

drop policy if exists "kudos read all"     on public.kudos;
drop policy if exists "kudos insert self"  on public.kudos;
drop policy if exists "kudos delete self"  on public.kudos;

create policy "kudos read all"
  on public.kudos for select
  using (true);

create policy "kudos insert self"
  on public.kudos for insert
  with check (user_id = (auth.jwt()->>'sub'));

create policy "kudos delete self"
  on public.kudos for delete
  using (user_id = (auth.jwt()->>'sub'));

------------------------------------------------------------------
-- comments
------------------------------------------------------------------
create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  hotspot_id   uuid not null references public.hotspots(id) on delete cascade,
  event_type   text not null check (event_type in ('report','cleanup')),
  author_id    text not null references public.profiles(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 1000),
  created_at   timestamptz not null default now()
);

create index if not exists comments_event_idx
  on public.comments (hotspot_id, event_type, created_at);

alter table public.comments enable row level security;

drop policy if exists "comments read all"     on public.comments;
drop policy if exists "comments insert self"  on public.comments;
drop policy if exists "comments delete self"  on public.comments;

create policy "comments read all"
  on public.comments for select
  using (true);

create policy "comments insert self"
  on public.comments for insert
  with check (author_id = (auth.jwt()->>'sub'));

create policy "comments delete self"
  on public.comments for delete
  using (author_id = (auth.jwt()->>'sub'));

------------------------------------------------------------------
-- feed_events: union of reports and cleanups, one row per feed item
------------------------------------------------------------------
create or replace view public.feed_events as
select
  h.id                                    as hotspot_id,
  'report'::text                          as event_type,
  h.reported_by                           as actor_id,
  h.created_at                            as event_at,
  h.description,
  h.difficulty,
  h.photo_url,
  h.status,
  ST_Y(h.location::geometry)              as lat,
  ST_X(h.location::geometry)              as lng
from public.hotspots h
where h.status in ('active','cleaned')
union all
select
  h.id                                    as hotspot_id,
  'cleanup'::text                         as event_type,
  h.cleaned_by                            as actor_id,
  h.cleaned_at                            as event_at,
  h.description,
  h.difficulty,
  coalesce(h.cleanup_photo_url, h.photo_url) as photo_url,
  h.status,
  ST_Y(h.location::geometry)              as lat,
  ST_X(h.location::geometry)              as lng
from public.hotspots h
where h.status = 'cleaned'
  and h.cleaned_by is not null
  and h.cleaned_at is not null;

grant select on public.feed_events to anon, authenticated;

------------------------------------------------------------------
-- RPC: feed_for_user — events from followees + the caller, paginated
-- by `before` (keyset on event_at). Includes kudos/comment counts and
-- whether the caller has kudoed the event.
------------------------------------------------------------------
drop function if exists public.feed_for_user(integer, timestamptz);

create or replace function public.feed_for_user(
  page_size integer default 20,
  before    timestamptz default null
)
returns table (
  hotspot_id          uuid,
  event_type          text,
  actor_id            text,
  actor_display_name  text,
  actor_username      text,
  actor_avatar_url    text,
  event_at            timestamptz,
  description         text,
  difficulty          smallint,
  photo_url           text,
  status              text,
  lat                 double precision,
  lng                 double precision,
  kudos_count         integer,
  comment_count       integer,
  has_kudoed          boolean
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with caller as (
    select (auth.jwt()->>'sub') as id
  ),
  visible as (
    select fl.followee_id as actor_id
    from public.follows fl, caller
    where fl.follower_id = caller.id
    union
    select caller.id as actor_id from caller
  )
  select
    fe.hotspot_id,
    fe.event_type,
    fe.actor_id,
    p.display_name                                           as actor_display_name,
    p.username::text                                         as actor_username,
    p.avatar_url                                             as actor_avatar_url,
    fe.event_at,
    fe.description,
    fe.difficulty,
    fe.photo_url,
    fe.status,
    fe.lat::double precision                                 as lat,
    fe.lng::double precision                                 as lng,
    coalesce(k.cnt, 0)::integer                              as kudos_count,
    coalesce(c.cnt, 0)::integer                              as comment_count,
    exists (
      select 1 from public.kudos kk
      where kk.hotspot_id = fe.hotspot_id
        and kk.event_type = fe.event_type
        and kk.user_id = (select id from caller)
    )                                                        as has_kudoed
  from public.feed_events fe
  join public.profiles p on p.id = fe.actor_id
  left join lateral (
    select count(*)::integer as cnt from public.kudos k
    where k.hotspot_id = fe.hotspot_id and k.event_type = fe.event_type
  ) k on true
  left join lateral (
    select count(*)::integer as cnt from public.comments cm
    where cm.hotspot_id = fe.hotspot_id and cm.event_type = fe.event_type
  ) c on true
  where fe.actor_id in (select actor_id from visible)
    and (before is null or fe.event_at < before)
  order by fe.event_at desc
  limit greatest(1, least(page_size, 100));
$$;

grant execute on function public.feed_for_user(integer, timestamptz) to authenticated;

------------------------------------------------------------------
-- RPC: profile_stats — counts surfaced on the profile page.
------------------------------------------------------------------
drop function if exists public.profile_stats(text);

create or replace function public.profile_stats(user_id text)
returns table (
  followers_count  integer,
  following_count  integer,
  reports_count    integer,
  cleanups_count   integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    (select count(*)::integer from public.follows where followee_id = user_id),
    (select count(*)::integer from public.follows where follower_id = user_id),
    (select count(*)::integer from public.hotspots where reported_by = user_id and status in ('active','cleaned')),
    (select count(*)::integer from public.hotspots where cleaned_by = user_id and status = 'cleaned');
$$;

grant execute on function public.profile_stats(text) to anon, authenticated;
