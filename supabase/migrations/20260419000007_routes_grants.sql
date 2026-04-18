-- Base table privileges for the routes tables. The routes migration
-- enabled RLS and added policies but didn't grant table-level privileges
-- to the `authenticated` role, causing "permission denied for table routes"
-- on any client query. RLS still applies on top of these grants.

grant select, insert, update, delete on public.routes          to authenticated;
grant select, insert, delete         on public.route_waypoints to authenticated;
grant select, insert, delete         on public.route_hotspots  to authenticated;
