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

/** Expand a bbox outward by `factor` on each side (e.g. 0.5 ≈ 2.25× area). */
export function expandBbox(bbox: BoundingBox, factor: number): BoundingBox {
  const lngPad = (bbox.maxLng - bbox.minLng) * factor;
  const latPad = (bbox.maxLat - bbox.minLat) * factor;
  return {
    minLng: bbox.minLng - lngPad,
    minLat: bbox.minLat - latPad,
    maxLng: bbox.maxLng + lngPad,
    maxLat: bbox.maxLat + latPad,
  };
}

/** True if `inner` is fully contained within `outer`. */
export function bboxContains(outer: BoundingBox, inner: BoundingBox): boolean {
  return (
    inner.minLng >= outer.minLng &&
    inner.maxLng <= outer.maxLng &&
    inner.minLat >= outer.minLat &&
    inner.maxLat <= outer.maxLat
  );
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

export interface GpsFix {
  lat: number;
  lng: number;
  /** Reported accuracy in meters (1-sigma circle radius). */
  accuracy: number;
  /** Unix timestamp in milliseconds. */
  timestamp: number;
}

/**
 * 1D Kalman filter for a stream of GPS fixes. Maintains a single position-
 * uncertainty estimate (variance in m²) that grows between updates by the
 * process noise and shrinks when new measurements arrive, weighted by each
 * fix's reported accuracy. The output is a smoothed lat/lng that pulls
 * strongly from confident fixes and largely ignores jittery ones.
 *
 * Process noise `Q` is in meters/second — how fast the real position can
 * drift between samples. ~2 m/s covers brisk walking / light jogging.
 */
export class GpsKalmanFilter {
  private lat = 0;
  private lng = 0;
  private variance = -1;
  private lastTimestamp = 0;
  private readonly processNoise: number;

  constructor(processNoiseMps = 2) {
    this.processNoise = processNoiseMps;
  }

  reset(): void {
    this.variance = -1;
    this.lastTimestamp = 0;
  }

  update(fix: GpsFix): LngLat {
    // Floor accuracy so a spuriously-tiny value can't freeze the filter.
    const accuracy = Math.max(fix.accuracy, 3);

    if (this.variance < 0) {
      this.lat = fix.lat;
      this.lng = fix.lng;
      this.variance = accuracy * accuracy;
      this.lastTimestamp = fix.timestamp;
      return { lat: this.lat, lng: this.lng };
    }

    const dt = Math.max((fix.timestamp - this.lastTimestamp) / 1000, 0);
    this.variance += dt * this.processNoise * this.processNoise;

    const k = this.variance / (this.variance + accuracy * accuracy);
    this.lat += k * (fix.lat - this.lat);
    this.lng += k * (fix.lng - this.lng);
    this.variance *= 1 - k;
    this.lastTimestamp = fix.timestamp;

    return { lat: this.lat, lng: this.lng };
  }
}

/** Format meters as a human-readable string: "0.23 km" or "180 m". */
export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}
