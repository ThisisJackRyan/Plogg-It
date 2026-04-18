export interface LngLat {
  lng: number;
  lat: number;
}

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/**
 * Expand a point into a bbox of roughly `radiusMeters`.
 * Approximate (treats 1° lat ≈ 111km, scales lng by cos(lat)) — fine for
 * viewport prefetching, not for authoritative distance calculations.
 */
export function pointToBbox(point: LngLat, radiusMeters: number): BoundingBox {
  const latDelta = radiusMeters / 111_000;
  const lngDelta = radiusMeters / (111_000 * Math.cos((point.lat * Math.PI) / 180));
  return {
    minLng: point.lng - lngDelta,
    minLat: point.lat - latDelta,
    maxLng: point.lng + lngDelta,
    maxLat: point.lat + latDelta,
  };
}

/** Haversine distance in meters between two points. Accurate to ~0.5% for short distances. */
export function haversineMeters(a: LngLat, b: LngLat): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Format meters as a human-readable string: "0.23 km" or "180 m". */
export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}
