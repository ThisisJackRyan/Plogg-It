'use client';

import { useFollow, useIsFollowing, useUnfollow } from '@plogg/supabase';
import { useSupabaseBrowser } from '@/lib/supabase/browser';

export function FollowButton({
  viewerId,
  targetId,
}: {
  viewerId: string;
  targetId: string;
}) {
  const supabase = useSupabaseBrowser();
  const { data: following, isLoading } = useIsFollowing(supabase, viewerId, targetId);
  const follow = useFollow(supabase, viewerId);
  const unfollow = useUnfollow(supabase, viewerId);

  const busy = follow.isPending || unfollow.isPending || isLoading;

  const onClick = () => {
    if (following) unfollow.mutate(targetId);
    else follow.mutate(targetId);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`rounded-lg px-4 py-2 text-xs font-semibold transition disabled:opacity-50 ${
        following
          ? 'bg-white text-black ring-1 ring-black/10 hover:bg-black/5'
          : 'bg-brand-600 text-white hover:bg-brand-700'
      }`}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
