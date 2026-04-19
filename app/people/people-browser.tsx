'use client';

import { useUser } from '@clerk/nextjs';
import { useFollow, useIsFollowing, useProfiles, useUnfollow } from '@plogg/supabase';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSupabaseBrowser } from '@/lib/supabase/browser';
import type { Profile } from '@plogg/types';
import { StaggerList, StaggerItem } from '@/components/motion';

export function PeopleBrowser() {
  const supabase = useSupabaseBrowser();
  const { user } = useUser();
  const viewerId = user?.id ?? null;

  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');

  // Debounce the search input so we're not hammering the DB on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(input), 200);
    return () => clearTimeout(t);
  }, [input]);

  const { data: profiles, isLoading, isError, error } = useProfiles(supabase, {
    search,
    excludeUserId: viewerId,
    limit: 50,
  });

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search by name or @username"
        className="w-full rounded-lg bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-brand-600"
      />

      {isLoading ? null : isError ? (
        <p className="py-8 text-center text-sm text-red-600">{error?.message}</p>
      ) : !profiles || profiles.length === 0 ? (
        <p className="py-8 text-center text-sm opacity-60">
          {search ? 'No ploggers match that search.' : 'No other ploggers yet.'}
        </p>
      ) : (
        <StaggerList className="divide-y divide-black/5 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          {profiles.map((p) => (
            <StaggerItem key={p.id}>
              <PersonRow profile={p} viewerId={viewerId} />
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}

function PersonRow({ profile, viewerId }: { profile: Profile; viewerId: string | null }) {
  const supabase = useSupabaseBrowser();
  const { data: following, isLoading } = useIsFollowing(supabase, viewerId, profile.id);
  const follow = useFollow(supabase, viewerId ?? '');
  const unfollow = useUnfollow(supabase, viewerId ?? '');
  const busy = follow.isPending || unfollow.isPending || isLoading;

  const onClick = () => {
    if (!viewerId) return;
    if (following) unfollow.mutate(profile.id);
    else follow.mutate(profile.id);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link
        href={profile.username ? `/u/${profile.username}` : '#'}
        className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
      >
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-brand-600/10" />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {profile.displayName ?? profile.username ?? 'Anonymous'}
          </p>
          {profile.username ? (
            <p className="truncate text-xs text-black/60">@{profile.username}</p>
          ) : null}
        </div>
      </Link>
      {viewerId ? (
        <button
          type="button"
          onClick={onClick}
          disabled={busy}
          className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${
            following
              ? 'bg-white text-black ring-1 ring-black/10 hover:bg-black/5'
              : 'bg-brand-600 text-white hover:bg-brand-700'
          }`}
        >
          {following ? 'Following' : 'Follow'}
        </button>
      ) : null}
    </div>
  );
}
