'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import type { BoundingBox, Hotspot } from '@plogg/types';
import { useHotspotsInBbox } from '@plogg/supabase';
import type { Map as MapboxMap } from 'mapbox-gl';
import { useCallback, useEffect, useRef, useState } from 'react';
import MapGL, {
  GeolocateControl,
  Marker,
  NavigationControl,
  Popup,
  type MapLayerMouseEvent,
  type MapRef,
  type ViewStateChangeEvent,
} from 'react-map-gl';
import { env } from '@/lib/env';
import { useSupabaseBrowser } from '@/lib/supabase/browser';

const FALLBACK_VIEW = {
  longitude: -122.4194,
  latitude: 37.7749,
  zoom: 12,
};

export function PloggMap() {
  const supabase = useSupabaseBrowser();
  const mapRef = useRef<MapRef | null>(null);
  const [bbox, setBbox] = useState<BoundingBox | null>(null);
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const [initialView, setInitialView] = useState<typeof FALLBACK_VIEW | null>(null);
  const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setInitialView(FALLBACK_VIEW);
      return;
    }
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

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
      () => {},
      { enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const { data: hotspots, isFetching } = useHotspotsInBbox(supabase, bbox);

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

  const handleMapClick = useCallback((_evt: MapLayerMouseEvent) => {
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
    <div className="fixed inset-0">
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
            <PinMarker difficulty={h.difficulty} />
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
            maxWidth="240px"
          >
            <HotspotCard hotspot={selected} />
          </Popup>
        ) : null}
      </MapGL>

      <button
        type="button"
        onClick={recenterOnUser}
        aria-label="Recenter on my location"
        className="absolute bottom-6 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/10 transition hover:bg-neutral-50 active:scale-95"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.94 3A9.002 9.002 0 0 0 13 3.06V1h-2v2.06A9.002 9.002 0 0 0 3.06 11H1v2h2.06A9.002 9.002 0 0 0 11 20.94V23h2v-2.06A9.002 9.002 0 0 0 20.94 13H23v-2h-2.06zM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14z" />
        </svg>
      </button>

      {isFetching ? (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs shadow">
          Loading hotspots…
        </div>
      ) : null}
    </div>
  );
}

function PinMarker({ difficulty }: { difficulty: number }) {
  const colors = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];
  const color = colors[Math.min(Math.max(difficulty, 1), 5) - 1] ?? '#22c55e';
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
  return (
    <div className="space-y-2 text-sm text-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={hotspot.photoUrl} alt="" className="aspect-video w-full rounded object-cover" />
      <p className="font-medium leading-snug">{hotspot.description}</p>
      <div className="flex items-center justify-between text-xs text-black/60">
        <span>Difficulty {hotspot.difficulty}/5</span>
        <span>{hotspot.reporterDisplayName ?? 'Anonymous'}</span>
      </div>
    </div>
  );
}
