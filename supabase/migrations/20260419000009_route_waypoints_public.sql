-- Expose route waypoints to the client as plain lat/lng columns.
-- PostgREST returns geography(Point) as hex-encoded EWKB, which is awkward
-- to parse in the browser. This view unpacks the geometry so the recap page
-- can fetch a simple list of {lat, lng, recorded_at, accuracy_m} rows.
--
-- security_invoker = true makes the view execute under the caller's identity,
-- so the existing route_waypoints RLS policies (owner-only select) apply.

create or replace view public.route_waypoints_public
with (security_invoker = true) as
select
  route_id,
  recorded_at,
  st_y(location::geometry) as lat,
  st_x(location::geometry) as lng,
  accuracy_m
from public.route_waypoints;

grant select on public.route_waypoints_public to authenticated;
