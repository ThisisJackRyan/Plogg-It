'use client';

import { formatDistance } from '@plogg/core';
import { useMyRoutes } from '@plogg/supabase';
import type { Route } from '@plogg/types';
import Link from 'next/link';
import { useSupabaseBrowser } from '@/lib/supabase/browser';
import { StaggerList, StaggerItem } from '@/components/motion';

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
      <span className="text-xl font-bold tabular-nums">{value}</span>
      <span className="text-xs font-medium uppercase tracking-wide text-black/50">{label}</span>
    </div>
  );
}

function RouteCard({ route }: { route: Route }) {
  const date = new Date(route.startedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link
      href={`/routes/${route.id}`}
      className="block rounded-xl border border-black/10 bg-white p-4 shadow-sm transition hover:border-brand-600/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-black/60">{date}</span>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          Completed
        </span>
      </div>
      <div className="mt-3 flex justify-around gap-2">
        <Stat label="Distance" value={formatDistance(route.totalDistanceM ?? 0)} />
        <Stat label="Time" value={formatDuration(route.startedAt, route.endedAt)} />
        <Stat label="Finds" value={String(route.hotspotCount)} />
      </div>
    </Link>
  );
}

export function RoutesList() {
  const supabase = useSupabaseBrowser();
  const { data: routes, isLoading } = useMyRoutes(supabase);

  if (isLoading) {
    return <p className="text-sm text-black/50">Loading…</p>;
  }

  if (!routes || routes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-lg font-medium">No routes yet</p>
        <p className="text-sm text-black/50">Start a route on the map to track your plogging.</p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Go to map
        </Link>
      </div>
    );
  }

  return (
    <StaggerList className="flex flex-col gap-3">
      {routes.map((route) => (
        <StaggerItem key={route.id}>
          <RouteCard route={route} />
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
