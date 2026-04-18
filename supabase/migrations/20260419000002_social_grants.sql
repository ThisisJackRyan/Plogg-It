-- Ensure the `authenticated` and `anon` roles have base table privileges on
-- the social tables. RLS is still enforced on top of these grants.

grant select, insert, delete on public.follows   to authenticated;
grant select                 on public.follows   to anon;

grant select, insert, delete on public.kudos     to authenticated;
grant select                 on public.kudos     to anon;

grant select, insert, delete on public.comments  to authenticated;
grant select                 on public.comments  to anon;

-- profiles already existed; harmless if already granted.
grant select, insert, update on public.profiles  to authenticated;
grant select                 on public.profiles  to anon;
