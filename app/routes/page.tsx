'use client';

import { formatDistance } from '@plogg/core';
import { useMyRoutes } from '@plogg/supabase';
import type { Route } from '@plogg/types';
import Link from 'next/link';
import { useSupabaseBrowser } from '@/lib/supabase/browser';

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return '—';
  const seconds = Math.floor(
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
  );
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
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
      className="block rounded-xl border border-black/10 bg-white p-4 shadow-sm hover:border-brand-600/40 hover:shadow-md transition"
    >
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-black/60">{date}</span>
        <span className="text-xs rounded-full bg-green-100 text-green-700 px-2 py-0.5 font-medium">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xl font-bold tabular-nums">{value}</span>
      <span className="text-xs font-medium uppercase tracking-wide text-black/50">{label}</span>
    </div>
  );
}

export default function RoutesPage() {
  const supabase = useSupabaseBrowser();
  const { data: routes, isLoading } = useMyRoutes(supabase);

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-xl flex-col gap-6 px-4 py-6 sm:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">My Routes</h1>
        <Link href="/" className="text-sm text-brand-700 hover:underline">
          Back to map
        </Link>
      </header>

      {isLoading ? (
        <p className="text-sm text-black/50">Loading…</p>
      ) : routes && routes.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {routes.map((route) => (
            <li key={route.id}>
              <RouteCard route={route} />
            </li>
          ))}
        </ul>
      ) : (
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
      )}
    </main>
  );
}
