'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import { formatDistance } from '@plogg/core';
import type { LngLat } from '@plogg/core';
import { useRoute, useRouteHotspots, useRouteWaypoints } from '@plogg/supabase';
import type { Hotspot, Route } from '@plogg/types';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import MapGL, { Layer, Marker, Source } from 'react-map-gl';
import { PageTransition, StaggerItem, StaggerList } from '@/components/motion';
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

function useCountUp(to: number, duration = 1.1, delay = 0) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(mv, to, { duration, delay, ease: [0.22, 1, 0.36, 1] });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [to, duration, delay, mv, rounded]);

  return display;
}

function DistanceStat({ meters }: { meters: number }) {
  const value = useCountUp(meters, 1.2, 0.15);
  return (
    <Stat label="Distance" value={formatDistance(value)} />
  );
}

function FindsStat({ count }: { count: number }) {
  const value = useCountUp(count, 1.0, 0.35);
  return <Stat label="Finds" value={String(value)} />;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-2xl font-bold tabular-nums sm:text-3xl">{value}</span>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-black/50">
        {label}
      </span>
    </div>
  );
}

function RouteMap({
  hotspots,
  waypoints,
}: {
  hotspots: Hotspot[];
  waypoints: LngLat[];
}) {
  const points: LngLat[] = [
    ...waypoints,
    ...hotspots.map((h) => ({ lat: h.lat, lng: h.lng })),
  ];
  if (points.length === 0) return null;

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const initialViewState =
    minLat === maxLat && minLng === maxLng
      ? { latitude: minLat, longitude: minLng, zoom: 15 }
      : {
          bounds: [
            [minLng, minLat],
            [maxLng, maxLat],
          ] as [[number, number], [number, number]],
          fitBoundsOptions: { padding: 40 },
        };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="h-64 overflow-hidden rounded-2xl border border-black/10 shadow-sm sm:h-80"
    >
      <MapGL
        interactive={false}
        initialViewState={initialViewState}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={env.MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        {waypoints.length >= 2 ? (
          <Source
            id="route-path"
            type="geojson"
            data={{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: waypoints.map((p) => [p.lng, p.lat]),
              },
              properties: {},
            }}
          >
            <Layer
              id="route-path-casing"
              type="line"
              paint={{ 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.9 }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
            <Layer
              id="route-path-line"
              type="line"
              paint={{ 'line-color': '#16a34a', 'line-width': 4, 'line-opacity': 0.95 }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </Source>
        ) : null}

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
    </motion.div>
  );
}

function HotspotItem({ hotspot }: { hotspot: Hotspot }) {
  const cleaned = hotspot.status === 'cleaned';
  return (
    <div className="flex gap-3 rounded-xl border border-black/10 bg-white p-3 shadow-sm transition hover:border-brand-600/40 hover:shadow-md">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={hotspot.photoUrl}
        alt=""
        className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug line-clamp-2">{hotspot.description}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-xs text-black/50">Difficulty {hotspot.difficulty}/5</span>
          {cleaned ? (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
              Cleaned
            </span>
          ) : null}
        </div>
        {!cleaned ? (
          <Link
            href={`/cleanup/${hotspot.id}`}
            className="mt-1.5 inline-block text-xs font-semibold text-brand-700 hover:underline"
          >
            Mark cleaned →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function RouteSummary({
  route,
  hotspots,
  waypoints,
}: {
  route: Route;
  hotspots: Hotspot[];
  waypoints: LngLat[];
}) {
  const date = new Date(route.startedAt).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-2"
      >
        <Link
          href="/routes"
          className="inline-flex items-center gap-1 text-xs font-medium text-black/60 transition hover:text-black"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden
          >
            <path
              d="M12.5 15 7.5 10l5-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          All routes
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
          Route summary
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{date}</h1>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.1 }}
        className="rounded-2xl border border-black/10 bg-gradient-to-br from-white to-brand-50/40 px-4 py-6 shadow-sm sm:px-6"
      >
        <div className="flex justify-around gap-2">
          <DistanceStat meters={route.totalDistanceM ?? 0} />
          <Stat label="Time" value={formatDuration(route.startedAt, route.endedAt)} />
          <FindsStat count={route.hotspotCount} />
        </div>
      </motion.div>

      <RouteMap hotspots={hotspots} waypoints={waypoints} />

      {hotspots.length > 0 ? (
        <section className="space-y-3">
          <motion.h2
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="text-xs font-semibold uppercase tracking-wider text-black/50"
          >
            Trash found ({hotspots.length})
          </motion.h2>
          <StaggerList className="flex flex-col gap-2.5">
            {hotspots.map((h) => (
              <StaggerItem key={h.id}>
                <HotspotItem hotspot={h} />
              </StaggerItem>
            ))}
          </StaggerList>
        </section>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="rounded-2xl border border-dashed border-black/10 bg-white/40 py-10 text-center"
        >
          <p className="text-sm text-black/50">No trash reported on this route.</p>
        </motion.div>
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
  const { data: waypoints = [], isLoading: waypointsLoading } = useRouteWaypoints(
    supabase,
    id,
  );

  const isLoading = routeLoading || hotspotsLoading || waypointsLoading;

  return (
    <main className="flex-1 bg-neutral-50">
      <PageTransition className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6 sm:p-6">
        {isLoading ? (
          <p className="text-sm text-black/50">Loading…</p>
        ) : route ? (
          <RouteSummary route={route} hotspots={hotspots} waypoints={waypoints} />
        ) : (
          <p className="text-sm text-red-600">Route not found.</p>
        )}
      </PageTransition>
    </main>
  );
}
