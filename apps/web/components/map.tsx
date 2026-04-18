'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import type { BoundingBox, Hotspot } from '@plogg/types';
import { useHotspotsInBbox } from '@plogg/supabase';
import type { Map as MapboxMap } from 'mapbox-gl';
import { useCallback, useState } from 'react';
import MapGL, {
  GeolocateControl,
  Marker,
  NavigationControl,
  Popup,
  type MapLayerMouseEvent,
  type ViewStateChangeEvent,
} from 'react-map-gl';
import { env } from '@/lib/env';
import { useSupabaseBrowser } from '@/lib/supabase/browser';

const INITIAL_VIEW = {
  longitude: -122.4194,
  latitude: 37.7749,
  zoom: 12,
};

export function PloggMap() {
  const supabase = useSupabaseBrowser();
  const [bbox, setBbox] = useState<BoundingBox | null>(null);
  const [selected, setSelected] = useState<Hotspot | null>(null);

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

  return (
    <div className="fixed inset-0">
      <MapGL
        initialViewState={INITIAL_VIEW}
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
