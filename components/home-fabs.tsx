'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouteSession } from './route-session-context';
import { useStartRoute, useFinalizeRoute, useDeleteRoute } from '@plogg/supabase';

const MIN_ROUTE_SECONDS = 60;
import { useSupabaseBrowser } from '@/lib/supabase/browser';

const EASE = [0.22, 1, 0.36, 1] as const;

export function HomeFabs() {
  const router = useRouter();
  const supabase = useSupabaseBrowser();
  const routeSession = useRouteSession();
  const startRouteMutation = useStartRoute(supabase);
  const finalizeRouteMutation = useFinalizeRoute(supabase);
  const deleteRouteMutation = useDeleteRoute(supabase);

  async function handleStartRoute() {
    const routeId = await startRouteMutation.mutateAsync();
    routeSession.startSession(routeId);
  }

  async function handleEndRoute() {
    if (!routeSession.routeId) return;
    const routeId = routeSession.routeId;
    const duration = routeSession.durationSeconds;
    routeSession.endSession();
    if (duration < MIN_ROUTE_SECONDS) {
      await deleteRouteMutation.mutateAsync(routeId);
      return;
    }
    const route = await finalizeRouteMutation.mutateAsync(routeId);
    router.push(`/routes/${route.id}`);
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {routeSession.isActive ? (
        <motion.div
          key="route-bar"
          initial={{ y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 96, opacity: 0 }}
          transition={{ duration: 0.42, ease: EASE }}
          className="absolute bottom-0 left-0 right-0 z-10 overflow-hidden rounded-t-3xl border-t border-white/60 bg-white/80 px-6 pb-5 pt-3 shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/10" />
          <RouteStats />
          <motion.div
            className="mt-4 flex gap-3"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: 0.18 }}
          >
            <Link
              href={`/report?routeId=${routeSession.routeId}`}
              className="flex-1 rounded-full bg-brand-600 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-95"
            >
              + Add Find
            </Link>
            <button
              type="button"
              onClick={handleEndRoute}
              disabled={finalizeRouteMutation.isPending || deleteRouteMutation.isPending}
              className="flex-1 rounded-full bg-black/90 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black active:scale-95 disabled:opacity-50"
            >
              {finalizeRouteMutation.isPending || deleteRouteMutation.isPending
                ? 'Saving…'
                : 'End Route'}
            </button>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="route-fabs"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.28, ease: EASE }}
          className="absolute bottom-6 left-4 right-4 z-10 flex flex-wrap items-center justify-center gap-3"
        >
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RouteStats() {
  const { distanceM, durationSeconds, itemCount } = useRouteSession();
  const m = Math.floor(durationSeconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (durationSeconds % 60).toString().padStart(2, '0');
  const distance =
    distanceM >= 1000 ? `${(distanceM / 1000).toFixed(2)} km` : `${Math.round(distanceM)} m`;

  return (
    <motion.div
      className="flex items-stretch justify-around divide-x divide-black/5"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
      }}
    >
      <Stat label="Distance" value={distance} />
      <Stat label="Time" value={`${m}:${s}`} />
      <Stat label="Finds" value={String(itemCount)} />
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      className="flex flex-1 flex-col items-center gap-0.5 px-2"
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
      }}
    >
      <span className="text-2xl font-bold tabular-nums tracking-tight text-black/90">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/45">
        {label}
      </span>
    </motion.div>
  );
}
