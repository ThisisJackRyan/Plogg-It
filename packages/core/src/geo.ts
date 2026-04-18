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
