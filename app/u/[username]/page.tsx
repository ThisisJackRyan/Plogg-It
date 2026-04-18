import { auth } from '@clerk/nextjs/server';
import { getProfileByUsername, getProfileStats, getUserStats } from '@plogg/supabase';
import { notFound } from 'next/navigation';
import { PageTransition, StaggerList, StaggerItem } from '@/components/motion';
import { FollowButton } from './follow-button';
import { getSupabaseServer } from '@/lib/supabase/server';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await getSupabaseServer();
  if (!supabase) notFound();

  const profile = await getProfileByUsername(supabase, username);
  if (!profile) notFound();

  const [{ userId }, stats, userStats] = await Promise.all([
    auth(),
    getProfileStats(supabase, profile.id),
    getUserStats(supabase, profile.id),
  ]);

  const isSelf = userId === profile.id;

  return (
    <main className="flex-1 bg-neutral-50">
      <PageTransition className="mx-auto max-w-xl space-y-6 px-4 py-6">
        <header className="flex flex-wrap items-start gap-3 sm:gap-4">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-14 w-14 rounded-full object-cover sm:h-16 sm:w-16"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-brand-600/10 sm:h-16 sm:w-16" />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold">
              {profile.displayName ?? profile.username ?? 'Anonymous'}
            </h1>
            {profile.username ? (
              <p className="truncate text-sm text-black/60">@{profile.username}</p>
            ) : null}
            {profile.bio ? <p className="mt-2 text-sm break-words">{profile.bio}</p> : null}
          </div>
          {isSelf ? (
            <a
              href="/settings/profile"
              className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-medium ring-1 ring-black/10 hover:bg-black/5"
            >
              Edit
            </a>
          ) : userId ? (
            <FollowButton viewerId={userId} targetId={profile.id} />
          ) : null}
        </header>

        <StaggerList className="grid grid-cols-2 gap-2 rounded-xl bg-white p-4 text-center text-sm shadow-sm ring-1 ring-black/5 sm:grid-cols-4">
          <StaggerItem><Stat label="Total Points" value={userStats?.total_points ?? 0} /></StaggerItem>
          <StaggerItem><Stat label="Current Streak" value={userStats?.current_streak ?? 0} /></StaggerItem>
          <StaggerItem><Stat label="Longest Streak" value={userStats?.longest_streak ?? 0} /></StaggerItem>
          <StaggerItem><Stat label="Followers" value={stats.followersCount} href={`/u/${username}/followers`} /></StaggerItem>
          <StaggerItem><Stat label="Following" value={stats.followingCount} href={`/u/${username}/following`} /></StaggerItem>
          <StaggerItem><Stat label="Reports" value={stats.reportsCount} /></StaggerItem>
          <StaggerItem><Stat label="Cleaned" value={stats.cleanupsCount} /></StaggerItem>
        </StaggerList>
      </PageTransition>
    </main>
  );
}

function Stat({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: number;
  icon?: string;
  href?: string;
}) {
  const inner = (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1 text-lg font-semibold">
        {icon && <span>{icon}</span>}
        {value}
      </div>
      <div className="text-xs text-black/60">{label}</div>
    </div>
  );
  return href ? (
    <a href={href} className="hover:underline">
      {inner}
    </a>
  ) : (
    inner
  );
}
