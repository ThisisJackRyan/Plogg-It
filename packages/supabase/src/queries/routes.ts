import type { LngLat } from '@plogg/core';
import type { Hotspot, Route, RouteWaypointInsert } from '@plogg/types';
import type { SupabaseClient } from '../client';
import { mapViewRowToHotspot, type ViewRow } from './hotspots';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

type RouteRow = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  total_distance_m: number | null;
  hotspot_count: number;
  status: string;
};

function mapRouteRow(row: RouteRow): Route {
  return {
    id: row.id,
    userId: row.user_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    totalDistanceM: row.total_distance_m,
    hotspotCount: row.hotspot_count,
    status: row.status as Route['status'],
  };
}

export async function startRoute(client: SupabaseClient): Promise<string> {
  const { data, error } = await (client as AnyClient).rpc('start_route');
  if (error) throw error;
  return data as string;
}

export async function insertWaypoints(
  client: SupabaseClient,
  waypoints: RouteWaypointInsert[],
): Promise<void> {
  if (waypoints.length === 0) return;
  const rows = waypoints.map((w) => ({
    route_id: w.routeId,
    location: `SRID=4326;POINT(${w.lng} ${w.lat})`,
    accuracy_m: w.accuracyM ?? null,
  }));
  const { error } = await (client as AnyClient).from('route_waypoints').insert(rows);
  if (error) throw error;
}

export async function finalizeRoute(
  client: SupabaseClient,
  routeId: string,
): Promise<Route> {
  const { data, error } = await (client as AnyClient).rpc('finalize_route', {
    p_route_id: routeId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return mapRouteRow(row as RouteRow);
}

export async function deleteRoute(
  client: SupabaseClient,
  routeId: string,
): Promise<void> {
  const { error } = await (client as AnyClient)
    .from('routes')
    .delete()
    .eq('id', routeId);
  if (error) throw error;
}

export async function linkHotspotToRoute(
  client: SupabaseClient,
  routeId: string,
  hotspotId: string,
): Promise<void> {
  const { error } = await (client as AnyClient)
    .from('route_hotspots')
    .insert({ route_id: routeId, hotspot_id: hotspotId });
  if (error) throw error;
}

export async function listMyRoutes(client: SupabaseClient): Promise<Route[]> {
  const { data, error } = await (client as AnyClient)
    .from('routes')
    .select('id, user_id, started_at, ended_at, total_distance_m, hotspot_count, status')
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as RouteRow[]).map(mapRouteRow);
}

export async function getRoute(
  client: SupabaseClient,
  routeId: string,
): Promise<Route | null> {
  const { data, error } = await (client as AnyClient)
    .from('routes')
    .select('id, user_id, started_at, ended_at, total_distance_m, hotspot_count, status')
    .eq('id', routeId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRouteRow(data as RouteRow);
}

export async function listRouteWaypoints(
  client: SupabaseClient,
  routeId: string,
): Promise<LngLat[]> {
  const { data, error } = await (client as AnyClient)
    .from('route_waypoints_public')
    .select('lat, lng, recorded_at')
    .eq('route_id', routeId)
    .order('recorded_at');
  if (error) throw error;
  return ((data ?? []) as Array<{ lat: number; lng: number }>).map((r) => ({
    lat: r.lat,
    lng: r.lng,
  }));
}

export async function listRouteHotspots(
  client: SupabaseClient,
  routeId: string,
): Promise<Hotspot[]> {
  const { data, error } = await (client as AnyClient)
    .from('route_hotspots')
    .select('added_at, hotspots_public!inner(*)')
    .eq('route_id', routeId)
    .order('added_at');
  if (error) throw error;
  return ((data ?? []) as Array<{ hotspots_public: ViewRow }>).map((row) =>
    mapViewRowToHotspot(row.hotspots_public),
  );
}
