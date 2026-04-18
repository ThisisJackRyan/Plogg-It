'use client';

import { useUser } from '@clerk/nextjs';
import { useFeed } from '@plogg/supabase';
import Link from 'next/link';
import { useSupabaseBrowser } from '@/lib/supabase/browser';
import { FeedCard } from '@/components/feed-card';

export function FeedList() {
  const supabase = useSupabaseBrowser();
  const { user } = useUser();
  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFeed(supabase, 20);

  if (isLoading) {
    return <p className="py-12 text-center text-sm opacity-60">Loading feed…</p>;
  }
  if (isError) {
    return <p className="py-12 text-center text-sm text-red-600">{error?.message}</p>;
  }

  const events = data?.pages.flat() ?? [];
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-black/10 p-8 text-center text-sm opacity-70">
        <p className="font-medium">Your feed is quiet.</p>
        <p className="mt-1">Follow other ploggers to see their reports and cleanups here.</p>
        <Link
          href="/people"
          className="mt-4 inline-block rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
        >
          Find people to follow
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((evt) => (
        <FeedCard
          key={`${evt.hotspotId}-${evt.eventType}`}
          event={evt}
          viewerId={user?.id ?? null}
        />
      ))}
      {hasNextPage ? (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="mx-auto block rounded-full bg-white px-4 py-2 text-sm shadow ring-1 ring-black/10 disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </div>
  );
}
