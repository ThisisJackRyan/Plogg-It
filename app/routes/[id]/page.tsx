'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import { formatDistance } from '@plogg/core';
import { useRoute, useRouteHotspots } from '@plogg/supabase';
import type { Hotspot, Route } from '@plogg/types';
import Link from 'next/link';
import { use } from 'react';
import MapGL, { Marker } from 'react-map-gl';
import { useSupabaseBrowser } from '@/lib/supabase/browser';
import { env } from '@/lib/env';

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return '—';
  const seconds = Math.floor(
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
  );
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xl font-bold tabular-nums sm:text-2xl">{value}</span>
      <span className="text-xs font-medium uppercase tracking-wide text-black/50">{label}</span>
    </div>
  );
}

function RouteMap({ hotspots }: { hotspots: Hotspot[] }) {
  if (hotspots.length === 0) return null;

  const centerLat = hotspots.reduce((s, h) => s + h.lat, 0) / hotspots.length;
  const centerLng = hotspots.reduce((s, h) => s + h.lng, 0) / hotspots.length;

  return (
    <div className="h-56 overflow-hidden rounded-xl border border-black/10 sm:h-72">
      <MapGL
        interactive={false}
        initialViewState={{ latitude: centerLat, longitude: centerLng, zoom: 14 }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={env.MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        {hotspots.map((h) => (
          <Marker key={h.id} longitude={h.lng} latitude={h.lat} anchor="bottom">
            <svg width="22" height="28" viewBox="0 0 28 36" aria-hidden>
              <path
                d="M14 35S27 22.8 27 13.5A13 13 0 1 0 1 13.5C1 22.8 14 35 14 35Z"
                fill="#22c55e"
                stroke="white"
                strokeWidth="2"
              />
              <circle cx="14" cy="13" r="4.5" fill="white" />
            </svg>
          </Marker>
        ))}
      </MapGL>
    </div>
  );
}

function HotspotItem({ hotspot }: { hotspot: Hotspot }) {
  return (
    <div className="flex gap-3 rounded-lg border border-black/10 bg-white p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={hotspot.photoUrl}
        alt=""
        className="h-16 w-16 flex-shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug line-clamp-2">{hotspot.description}</p>
        <p className="mt-1 text-xs text-black/50">Difficulty {hotspot.difficulty}/5</p>
        {hotspot.status === 'cleaned' ? (
          <p className="mt-1 text-xs font-semibold text-blue-600">Cleaned ✓</p>
        ) : (
          <Link
            href={`/cleanup/${hotspot.id}`}
            className="mt-1 inline-block text-xs font-semibold text-brand-700 hover:underline"
          >
            Mark cleaned
          </Link>
        )}
      </div>
    </div>
  );
}

function RouteSummary({ route, hotspots }: { route: Route; hotspots: Hotspot[] }) {
  const date = new Date(route.startedAt).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-black/50">{date}</p>

      <div className="rounded-xl border border-black/10 bg-white px-4 py-5 sm:px-6">
        <div className="flex justify-around gap-2">
          <Stat label="Distance" value={formatDistance(route.totalDistanceM ?? 0)} />
          <Stat label="Time" value={formatDuration(route.startedAt, route.endedAt)} />
          <Stat label="Finds" value={String(route.hotspotCount)} />
        </div>
      </div>

      <RouteMap hotspots={hotspots} />

      {hotspots.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50">
            Trash found
          </h2>
          {hotspots.map((h) => (
            <HotspotItem key={h.id} hotspot={h} />
          ))}
        </section>
      ) : (
        <p className="text-sm text-black/50">No trash reported on this route.</p>
      )}
    </div>
  );
}

export default function RouteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const supabase = useSupabaseBrowser();
  const { data: route, isLoading: routeLoading } = useRoute(supabase, id);
  const { data: hotspots = [], isLoading: hotspotsLoading } = useRouteHotspots(supabase, id);

  const isLoading = routeLoading || hotspotsLoading;

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-xl flex-col gap-6 px-4 py-6 sm:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Route Summary</h1>
        <Link href="/routes" className="text-sm text-brand-700 hover:underline">
          All routes
        </Link>
      </header>

      {isLoading ? (
        <p className="text-sm text-black/50">Loading…</p>
      ) : route ? (
        <RouteSummary route={route} hotspots={hotspots} />
      ) : (
        <p className="text-sm text-red-600">Route not found.</p>
      )}
    </main>
  );
}
