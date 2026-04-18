'use client';

import { formatDistance } from '@plogg/core';
import { useRouteSession } from './route-session-context';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs font-medium uppercase tracking-wide text-black/50">{label}</span>
    </div>
  );
}

export function RouteStatsBar({ onEnd }: { onEnd: () => void }) {
  const { distanceM, durationSeconds, itemCount } = useRouteSession();

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 rounded-t-2xl bg-white/95 px-6 py-4 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-around">
        <Stat label="Distance" value={formatDistance(distanceM)} />
        <Stat label="Time" value={formatDuration(durationSeconds)} />
        <Stat label="Finds" value={String(itemCount)} />
      </div>
      <button
        type="button"
        onClick={onEnd}
        className="mt-4 w-full rounded-full bg-red-500 py-3 text-sm font-semibold text-white shadow hover:bg-red-600 active:scale-95 transition"
      >
        End Route
      </button>
    </div>
  );
}
