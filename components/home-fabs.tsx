'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRouteSession } from './route-session-context';
import { useStartRoute, useFinalizeRoute } from '@plogg/supabase';
import { useSupabaseBrowser } from '@/lib/supabase/browser';

export function HomeFabs() {
  const router = useRouter();
  const supabase = useSupabaseBrowser();
  const routeSession = useRouteSession();
  const startRouteMutation = useStartRoute(supabase);
  const finalizeRouteMutation = useFinalizeRoute(supabase);

  async function handleStartRoute() {
    const routeId = await startRouteMutation.mutateAsync();
    routeSession.startSession(routeId);
  }

  async function handleEndRoute() {
    if (!routeSession.routeId) return;
    const routeId = routeSession.routeId;
    routeSession.endSession();
    const route = await finalizeRouteMutation.mutateAsync(routeId);
    router.push(`/routes/${route.id}`);
  }

  if (routeSession.isActive) {
    return (
      <div className="animate-rise-in absolute bottom-0 left-0 right-0 z-10 rounded-t-2xl bg-white/95 px-6 py-4 shadow-xl backdrop-blur-sm">
        <RouteStats />
        <div className="mt-4 flex gap-3">
          <Link
            href={`/report?routeId=${routeSession.routeId}`}
            className="flex-1 rounded-full bg-brand-600 py-3 text-center text-sm font-semibold text-white shadow hover:bg-brand-700 active:scale-95 transition"
          >
            + Add Find
          </Link>
          <button
            type="button"
            onClick={handleEndRoute}
            disabled={finalizeRouteMutation.isPending}
            className="flex-1 rounded-full bg-red-500 py-3 text-sm font-semibold text-white shadow hover:bg-red-600 active:scale-95 transition disabled:opacity-50"
          >
            {finalizeRouteMutation.isPending ? 'Saving…' : 'End Route'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise-in absolute bottom-6 left-4 right-4 z-10 flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        onClick={handleStartRoute}
        disabled={startRouteMutation.isPending}
        className="whitespace-nowrap rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand-700 shadow-lg ring-1 ring-brand-600/30 transition hover:bg-brand-50 active:scale-95 disabled:opacity-50"
      >
        {startRouteMutation.isPending ? 'Starting…' : 'Start Route'}
      </button>
      <Link
        href="/report"
        className="whitespace-nowrap rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-700 active:scale-95"
      >
        + Report trash
      </Link>
    </div>
  );
}

function RouteStats() {
  const { distanceM, durationSeconds, itemCount } = useRouteSession();
  const m = Math.floor(durationSeconds / 60).toString().padStart(2, '0');
  const s = (durationSeconds % 60).toString().padStart(2, '0');
  const distance =
    distanceM >= 1000 ? `${(distanceM / 1000).toFixed(2)} km` : `${Math.round(distanceM)} m`;

  return (
    <div className="flex items-center justify-around">
      <Stat label="Distance" value={distance} />
      <Stat label="Time" value={`${m}:${s}`} />
      <Stat label="Finds" value={String(itemCount)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs font-medium uppercase tracking-wide text-black/50">{label}</span>
    </div>
  );
}
