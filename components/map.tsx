'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import type { BoundingBox, Hotspot, HotspotStatusFilter } from '@plogg/types';
import type { LngLat } from '@plogg/core';
import { useHotspotsInBbox, useInsertWaypoints } from '@plogg/supabase';
import { CheckCircle2 } from 'lucide-react';
import type { Map as MapboxMap } from 'mapbox-gl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapGL, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapRef,
  type ViewStateChangeEvent,
} from 'react-map-gl';
import { env } from '@/lib/env';
import { useSupabaseBrowser } from '@/lib/supabase/browser';
import { useRouteSession } from './route-session-context';

const FALLBACK_VIEW = {
  longitude: -122.4194,
  latitude: 37.7749,
  zoom: 12,
};

const CLEANED_COLOR = '#2563eb';

export function PloggMap() {
  const supabase = useSupabaseBrowser();
  const routeSession = useRouteSession();
  const insertWaypointsMutation = useInsertWaypoints(supabase);

  const searchParams = useSearchParams();
  const targetView = useMemo(() => {
    const lat = Number(searchParams.get('lat'));
    const lng = Number(searchParams.get('lng'));
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      return { latitude: lat, longitude: lng, zoom: 15 };
    }
    return null;
  }, [searchParams]);

  const mapRef = useRef<MapRef | null>(null);
  const [bbox, setBbox] = useState<BoundingBox | null>(null);
  const [filter, setFilter] = useState<HotspotStatusFilter>('active');
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const [initialView, setInitialView] = useState<typeof FALLBACK_VIEW | null>(null);
  const [userLocation, setUserLocation] = useState<LngLat | null>(null);
  const [pathPoints, setPathPoints] = useState<LngLat[]>([]);

  // Buffer of waypoints not yet flushed to the DB.
  const pendingWaypointsRef = useRef<Array<{ routeId: string; lat: number; lng: number }>>([]);

  useEffect(() => {
    if (targetView) {
      setInitialView(targetView);
    } else if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setInitialView(FALLBACK_VIEW);
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setInitialView({
            longitude: pos.coords.longitude,
            latitude: pos.coords.latitude,
            zoom: 13,
          });
        },
        () => setInitialView(FALLBACK_VIEW),
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const point = { lng: pos.coords.longitude, lat: pos.coords.latitude };
        setUserLocation(point);
        if (routeSession.isActive && routeSession.routeId) {
          routeSession.addWaypoint(point);
          pendingWaypointsRef.current.push({ routeId: routeSession.routeId, ...point });
        }
      },
      () => {},
      { enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSession.isActive, routeSession.routeId, targetView]);

  // Flush accumulated waypoints to the DB every 15 seconds while a route is active.
  useEffect(() => {
    if (!routeSession.isActive || !routeSession.routeId) return;
    const interval = setInterval(() => {
      const batch = pendingWaypointsRef.current.splice(0);
      if (batch.length === 0) return;
      insertWaypointsMutation.mutate(
        batch.map((w) => ({ routeId: w.routeId, lat: w.lat, lng: w.lng })),
      );
    }, 15_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSession.isActive, routeSession.routeId]);

  // Sync the displayed path from the waypoints ref every 5 seconds while active.
  useEffect(() => {
    if (!routeSession.isActive) {
      setPathPoints([]);
      return;
    }
    const interval = setInterval(() => {
      setPathPoints(routeSession.getWaypoints());
    }, 5_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSession.isActive]);

  useEffect(() => {
    if (!targetView) return;
    mapRef.current?.flyTo({
      center: [targetView.longitude, targetView.latitude],
      zoom: targetView.zoom,
      essential: true,
    });
  }, [targetView]);

  const { data: hotspots, isFetching } = useHotspotsInBbox(supabase, bbox, filter);

  const handleMoveEnd = useCallback((evt: ViewStateChangeEvent) => {
    const bounds = evt.target.getBounds();
    if (!bounds) return;
    setBbox({
      minLng: bounds.getWest(),
      minLat: bounds.getSouth(),
      maxLng: bounds.getEast(),
      maxLat: bounds.getNorth(),
    });
  }, []);

  const handleLoad = useCallback((evt: { target: MapboxMap }) => {
    const bounds = evt.target.getBounds();
    if (!bounds) return;
    setBbox({
      minLng: bounds.getWest(),
      minLat: bounds.getSouth(),
      maxLng: bounds.getEast(),
      maxLat: bounds.getNorth(),
    });
  }, []);

  const handleMapClick = useCallback(() => {
    setSelected(null);
  }, []);

  const recenterOnUser = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lng: pos.coords.longitude, lat: pos.coords.latitude });
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          essential: true,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  if (!initialView) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-neutral-100 text-sm text-neutral-500">
        Finding your location…
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <MapGL
        ref={mapRef}
        initialViewState={initialView}
        onMoveEnd={handleMoveEnd}
        onLoad={handleLoad}
        onClick={handleMapClick}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={env.MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />

        {userLocation ? (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
            <span className="relative flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-60" />
              <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow" />
            </span>
          </Marker>
        ) : null}

        {hotspots?.map((h) => (
          <Marker
            key={h.id}
            longitude={h.lng}
            latitude={h.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent?.stopPropagation();
              setSelected(h);
            }}
          >
            <PinMarker hotspot={h} />
          </Marker>
        ))}

        {selected ? (
          <Popup
            longitude={selected.lng}
            latitude={selected.lat}
            anchor="bottom"
            offset={28}
            closeOnClick={false}
            onClose={() => setSelected(null)}
            maxWidth="260px"
          >
            <HotspotCard hotspot={selected} />
          </Popup>
        ) : null}

        {pathPoints.length >= 2 ? (
          <Source
            id="route-path"
            type="geojson"
            data={{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: pathPoints.map((p) => [p.lng, p.lat]),
              },
              properties: {},
            }}
          >
            <Layer
              id="route-path-line"
              type="line"
              paint={{ 'line-color': '#2563eb', 'line-width': 4, 'line-opacity': 0.85 }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </Source>
        ) : null}
      </MapGL>

      <FilterPills value={filter} onChange={setFilter} />

      <button
        type="button"
        onClick={recenterOnUser}
        aria-label="Recenter on my location"
        className={`absolute right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/10 transition hover:bg-neutral-50 active:scale-95 ${routeSession.isActive ? 'bottom-48' : 'bottom-6'}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.94 3A9.002 9.002 0 0 0 13 3.06V1h-2v2.06A9.002 9.002 0 0 0 3.06 11H1v2h2.06A9.002 9.002 0 0 0 11 20.94V23h2v-2.06A9.002 9.002 0 0 0 20.94 13H23v-2h-2.06zM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14z" />
        </svg>
      </button>

      {isFetching ? (
        <div className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs shadow">
          Loading trash spots…
        </div>
      ) : null}
    </div>
  );
}

function FilterPills({
  value,
  onChange,
}: {
  value: HotspotStatusFilter;
  onChange: (next: HotspotStatusFilter) => void;
}) {
  const options: { key: HotspotStatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'To clean' },
    { key: 'cleaned', label: 'Cleaned' },
  ];
  return (
    <div className="absolute left-1/2 top-4 flex -translate-x-1/2 overflow-hidden rounded-full bg-white/95 text-xs shadow">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`px-3 py-1.5 font-medium transition ${
            value === opt.key
              ? 'bg-brand-600 text-white'
              : 'text-black/70 hover:bg-black/5'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function PinMarker({ hotspot }: { hotspot: Hotspot }) {
  if (hotspot.status === 'cleaned') {
    return (
      <svg width="28" height="36" viewBox="0 0 28 36" aria-hidden>
        <path
          d="M14 35S27 22.8 27 13.5A13 13 0 1 0 1 13.5C1 22.8 14 35 14 35Z"
          fill={CLEANED_COLOR}
          stroke="white"
          strokeWidth="2"
        />
        <path
          d="M8.5 13.5 12.5 17.5 19.5 10"
          stroke="white"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  const colors = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];
  const color = colors[Math.min(Math.max(hotspot.difficulty, 1), 5) - 1] ?? '#22c55e';
  return (
    <svg width="28" height="36" viewBox="0 0 28 36" aria-hidden>
      <path
        d="M14 35S27 22.8 27 13.5A13 13 0 1 0 1 13.5C1 22.8 14 35 14 35Z"
        fill={color}
        stroke="white"
        strokeWidth="2"
      />
      <circle cx="14" cy="13" r="4.5" fill="white" />
    </svg>
  );
}

function HotspotCard({ hotspot }: { hotspot: Hotspot }) {
  const isCleaned = hotspot.status === 'cleaned';
  return (
    <div className="space-y-2 text-sm text-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={hotspot.photoUrl} alt="" className="aspect-video w-full rounded object-cover" />
      <p className="font-medium leading-snug">{hotspot.description}</p>
      <div className="flex items-center justify-between text-xs text-black/60">
        <span>Difficulty {hotspot.difficulty}/5</span>
        <span>{hotspot.reporterDisplayName ?? 'Anonymous'}</span>
      </div>
      {isCleaned && hotspot.cleanupPhotoUrl ? (
        <div className="space-y-1 border-t border-black/10 pt-2">
          <p className="flex items-center gap-1 text-xs font-semibold text-blue-700">
            <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
            Cleaned
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hotspot.cleanupPhotoUrl}
            alt="Cleanup proof"
            className="aspect-video w-full rounded object-cover"
          />
          <p className="text-xs text-black/60">
            by {hotspot.cleanerDisplayName ?? 'Anonymous'}
          </p>
        </div>
      ) : null}
      {!isCleaned ? (
        <Link
          href={`/cleanup/${hotspot.id}`}
          className="block rounded-md bg-brand-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-brand-700"
        >
          I cleaned this
        </Link>
      ) : null}
    </div>
  );
}
