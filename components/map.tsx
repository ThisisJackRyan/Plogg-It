'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import { motion } from 'framer-motion';
import type { BoundingBox, Hotspot, HotspotStatusFilter } from '@plogg/types';
import type { LngLat } from '@plogg/core';
import { useHotspotsInBbox, useInsertWaypoints } from '@plogg/supabase';
import { CheckCircle2, MapPin } from 'lucide-react';
import type { Map as MapboxMap } from 'mapbox-gl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapGL, {
  GeolocateControl,
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
  const [initialView, setInitialView] = useState<typeof FALLBACK_VIEW>(
    () => targetView ?? FALLBACK_VIEW,
  );
  const [userLocation, setUserLocation] = useState<LngLat | null>(null);
  const [pathPoints, setPathPoints] = useState<LngLat[]>([]);
  const [locationStatus, setLocationStatus] = useState<
    'pending' | 'granted' | 'denied' | 'unavailable'
  >('pending');
  const [promptDismissed, setPromptDismissed] = useState(false);

  // Buffer of waypoints not yet flushed to the DB.
  const pendingWaypointsRef = useRef<
    Array<{ routeId: string; lat: number; lng: number; accuracyM: number }>
  >([]);

  useEffect(() => {
    if (targetView) {
      setInitialView(targetView);
      setLocationStatus('granted');
    } else if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setInitialView(FALLBACK_VIEW);
      setLocationStatus('unavailable');
    } else {
      setInitialView(FALLBACK_VIEW);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationStatus('granted');
          setUserLocation({ lng: pos.coords.longitude, lat: pos.coords.latitude });
          mapRef.current?.flyTo({
            center: [pos.coords.longitude, pos.coords.latitude],
            zoom: 14,
            essential: true,
          });
        },
        (err) => {
          setLocationStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const rawPoint = { lng: pos.coords.longitude, lat: pos.coords.latitude };
        setUserLocation(rawPoint);
        setLocationStatus('granted');
        if (routeSession.isActive && routeSession.routeId) {
          const smoothed = routeSession.addWaypoint({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          });
          if (smoothed) {
            pendingWaypointsRef.current.push({
              routeId: routeSession.routeId,
              lat: smoothed.lat,
              lng: smoothed.lng,
              accuracyM: pos.coords.accuracy,
            });
          }
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
        batch.map((w) => ({
          routeId: w.routeId,
          lat: w.lat,
          lng: w.lng,
          accuracyM: w.accuracyM,
        })),
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
        setLocationStatus('granted');
        setPromptDismissed(true);
        setUserLocation({ lng: pos.coords.longitude, lat: pos.coords.latitude });
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          essential: true,
        });
      },
      (err) => {
        setLocationStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const showLocationPrompt =
    !promptDismissed && !targetView && locationStatus !== 'granted';

  if (showLocationPrompt) {
    return (
      <div className="absolute inset-0">
        <MapSkeleton showIndicator={false} />
        <LocationPrompt
          status={locationStatus}
          onEnable={recenterOnUser}
          onDismiss={() => setPromptDismissed(true)}
        />
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
        <GeolocateControl
          position="top-right"
          trackUserLocation
          showUserHeading
          positionOptions={{ enableHighAccuracy: true }}
        />

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

      {isFetching ? (
        <div className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs shadow">
          Loading trash spots…
        </div>
      ) : null}

    </div>
  );
}

function MapSkeleton({ showIndicator = true }: { showIndicator?: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-brand-500/20 via-brand-500/10 to-brand-500/5">
      <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.6),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.5),transparent_40%)]" />
      {showIndicator ? (
        <div className="relative flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-brand-700">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-40" />
              <MapPin aria-hidden className="relative h-8 w-8" />
            </div>
            <p className="text-sm font-medium">Loading the map…</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LocationPrompt({
  status,
  onEnable,
  onDismiss,
}: {
  status: 'pending' | 'granted' | 'denied' | 'unavailable';
  onEnable: () => void;
  onDismiss: () => void;
}) {
  const isDenied = status === 'denied';
  const isUnavailable = status === 'unavailable';
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="pointer-events-none absolute inset-0 flex items-end justify-center p-4 sm:items-center"
    >
      <motion.div
        initial={{ y: 24, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.08 }}
        className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white/95 shadow-2xl ring-1 ring-black/10 backdrop-blur"
      >
        <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-5 py-6 text-white">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 340, damping: 18, delay: 0.22 }}
              className="relative flex h-11 w-11 items-center justify-center"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/40" />
              <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
                <MapPin aria-hidden className="h-6 w-6" />
              </span>
            </motion.div>
            <motion.div
              initial={{ x: -8, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <h2 className="text-base font-semibold leading-tight">
                Location is highly recommended
              </h2>
              <p className="text-xs text-white/85">
                Plogg Club won&apos;t really work without it
              </p>
            </motion.div>
          </div>
        </div>
        <div className="space-y-3 px-5 py-4">
          {isDenied ? (
            <p className="text-sm text-black/70">
              Location is blocked. We highly recommend enabling it in your
              browser settings — Plogg Club uses it to show nearby trash, track
              your route while plogging, and drop accurate pins.
            </p>
          ) : isUnavailable ? (
            <p className="text-sm text-black/70">
              We couldn&apos;t read your location. Most of Plogg Club — route
              tracking, nearby trash, accurate pins — needs it to work, so try
              again when you can.
            </p>
          ) : (
            <p className="text-sm text-black/70">
              We highly recommend sharing your location. Plogg Club uses it to
              show nearby trash, track your route while plogging, and drop
              accurate pins — the site won&apos;t really work without it.
            </p>
          )}
          <div className="flex gap-2">
            {!isDenied ? (
              <button
                type="button"
                onClick={onEnable}
                className="flex-1 rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]"
              >
                Share my location
              </button>
            ) : null}
            <button
              type="button"
              onClick={onDismiss}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium text-black/70 transition hover:bg-black/5 ${
                isDenied ? 'flex-1' : ''
              }`}
            >
              {isDenied ? 'Browse the map' : 'Not now'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
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
    <div className="absolute left-1/2 top-3 flex -translate-x-1/2 overflow-hidden rounded-full bg-white/95 text-xs shadow sm:top-4 sm:text-sm">
      {options.map((opt) => {
        const isActive = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className="relative whitespace-nowrap px-4 py-2 font-medium transition-colors duration-200 active:scale-[0.97]"
          >
            {isActive ? (
              <motion.span
                layoutId="filter-pill-active"
                className="absolute inset-0 rounded-full bg-brand-600"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span className={`relative z-10 ${isActive ? 'text-white' : 'text-black/70'}`}>
              {opt.label}
            </span>
          </button>
        );
      })}
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
