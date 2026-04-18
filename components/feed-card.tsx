'use client';

import { useKudos } from '@plogg/supabase';
import type { FeedEvent } from '@plogg/types';
import { Heart, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useOptimistic, useTransition } from 'react';
import { useSupabaseBrowser } from '@/lib/supabase/browser';

function eventHref(evt: FeedEvent) {
  return `/events/${evt.hotspotId}/${evt.eventType}`;
}

function actorHref(evt: FeedEvent) {
  return evt.actorUsername ? `/u/${evt.actorUsername}` : '#';
}

function actorName(evt: FeedEvent) {
  return evt.actorDisplayName ?? evt.actorUsername ?? 'Anonymous plogger';
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function FeedCard({
  event,
  viewerId,
}: {
  event: FeedEvent;
  viewerId: string | null;
}) {
  const supabase = useSupabaseBrowser();
  const { add, remove } = useKudos(supabase, viewerId ?? '');
  const [optimistic, setOptimistic] = useOptimistic(
    { hasKudoed: event.hasKudoed, count: event.kudosCount },
    (state, next: { hasKudoed: boolean; count: number }) => next,
  );
  const [, startTransition] = useTransition();

  const onToggleKudos = () => {
    if (!viewerId) return;
    const next = optimistic.hasKudoed
      ? { hasKudoed: false, count: Math.max(0, optimistic.count - 1) }
      : { hasKudoed: true, count: optimistic.count + 1 };
    startTransition(() => {
      setOptimistic(next);
      if (next.hasKudoed) {
        add.mutate({ hotspotId: event.hotspotId, eventType: event.eventType });
      } else {
        remove.mutate({ hotspotId: event.hotspotId, eventType: event.eventType });
      }
    });
  };

  const badge =
    event.eventType === 'cleanup' ? (
      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
        Cleaned
      </span>
    ) : (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        Reported
      </span>
    );

  return (
    <article className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
      <header className="flex items-center gap-3 px-4 py-3">
        {event.actorAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.actorAvatarUrl}
            alt=""
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-brand-600/10" />
        )}
        <div className="flex-1 leading-tight">
          <Link href={actorHref(event)} className="text-sm font-semibold hover:underline">
            {actorName(event)}
          </Link>
          <div className="flex items-center gap-2 text-xs text-black/60">
            {badge}
            <span>{relativeTime(event.eventAt)}</span>
          </div>
        </div>
      </header>
      <Link href={eventHref(event)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.photoUrl}
          alt={event.description}
          className="aspect-video w-full object-cover"
        />
      </Link>
      <div className="space-y-3 px-4 py-3">
        <p className="text-sm">{event.description}</p>
        <div className="flex items-center gap-4 text-sm">
          <button
            type="button"
            onClick={onToggleKudos}
            disabled={!viewerId}
            aria-pressed={optimistic.hasKudoed}
            className={`flex items-center gap-1 rounded-full px-3 py-1 transition ${
              optimistic.hasKudoed
                ? 'bg-brand-600 text-white'
                : 'bg-black/5 text-black/70 hover:bg-black/10'
            }`}
          >
            <Heart
              aria-hidden
              className="h-4 w-4"
              fill={optimistic.hasKudoed ? 'currentColor' : 'none'}
            />
            <span>{optimistic.count}</span>
          </button>
          <Link
            href={eventHref(event)}
            className="flex items-center gap-1 rounded-full bg-black/5 px-3 py-1 text-black/70 hover:bg-black/10"
          >
            <MessageCircle aria-hidden className="h-4 w-4" />
            <span>{event.commentCount}</span>
          </Link>
          <Link
            href={`/?lat=${event.lat}&lng=${event.lng}`}
            className="ml-auto text-xs text-brand-700 hover:underline"
          >
            View on map
          </Link>
        </div>
      </div>
    </article>
  );
}
