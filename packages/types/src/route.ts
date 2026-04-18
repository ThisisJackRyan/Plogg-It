export type RouteStatus = 'active' | 'completed' | 'discarded';

export type Route = {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  totalDistanceM: number | null;
  hotspotCount: number;
  status: RouteStatus;
};

export type RouteWaypointInsert = {
  routeId: string;
  lat: number;
  lng: number;
  accuracyM?: number | null;
};
