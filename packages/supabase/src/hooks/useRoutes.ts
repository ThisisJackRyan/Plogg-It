import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { LngLat } from '@plogg/core';
import type { Hotspot, Route, RouteWaypointInsert } from '@plogg/types';
import type { SupabaseClient } from '../client';
import {
  finalizeRoute,
  getRoute,
  insertWaypoints,
  linkHotspotToRoute,
  listMyRoutes,
  listRouteHotspots,
  listRouteWaypoints,
  startRoute,
} from '../queries/routes';

const ROUTES_KEY = ['routes'] as const;

export function useMyRoutes(client: SupabaseClient): UseQueryResult<Route[], Error> {
  return useQuery({
    queryKey: [...ROUTES_KEY, 'mine'],
    staleTime: 60_000,
    queryFn: () => listMyRoutes(client),
  });
}

export function useRoute(
  client: SupabaseClient,
  routeId: string | null,
): UseQueryResult<Route | null, Error> {
  return useQuery({
    queryKey: [...ROUTES_KEY, 'detail', routeId],
    enabled: routeId !== null,
    queryFn: () => getRoute(client, routeId!),
  });
}

export function useRouteHotspots(
  client: SupabaseClient,
  routeId: string | null,
): UseQueryResult<Hotspot[], Error> {
  return useQuery({
    queryKey: [...ROUTES_KEY, 'hotspots', routeId],
    enabled: routeId !== null,
    queryFn: () => listRouteHotspots(client, routeId!),
  });
}

export function useRouteWaypoints(
  client: SupabaseClient,
  routeId: string | null,
): UseQueryResult<LngLat[], Error> {
  return useQuery({
    queryKey: [...ROUTES_KEY, 'waypoints', routeId],
    enabled: routeId !== null,
    queryFn: () => listRouteWaypoints(client, routeId!),
  });
}

export function useStartRoute(client: SupabaseClient): UseMutationResult<string, Error, void> {
  return useMutation({
    mutationFn: () => startRoute(client),
  });
}

export function useFinalizeRoute(
  client: SupabaseClient,
): UseMutationResult<Route, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (routeId: string) => finalizeRoute(client, routeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROUTES_KEY });
    },
  });
}

export function useInsertWaypoints(
  client: SupabaseClient,
): UseMutationResult<void, Error, RouteWaypointInsert[]> {
  return useMutation({
    mutationFn: (waypoints: RouteWaypointInsert[]) => insertWaypoints(client, waypoints),
  });
}

export function useLinkHotspotToRoute(
  client: SupabaseClient,
): UseMutationResult<void, Error, { routeId: string; hotspotId: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ routeId, hotspotId }) => linkHotspotToRoute(client, routeId, hotspotId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROUTES_KEY });
    },
  });
}
