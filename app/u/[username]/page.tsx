import { auth } from '@clerk/nextjs/server';
import { getProfileByUsername, getProfileStats } from '@plogg/supabase';
import { notFound } from 'next/navigation';
import { TopNav } from '@/components/nav';
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

  const [{ userId }, stats] = await Promise.all([
    auth(),
    getProfileStats(supabase, profile.id),
  ]);

  const isSelf = userId === profile.id;

  return (
    <main className="min-h-screen bg-neutral-50">
      <TopNav active={isSelf ? 'profile' : undefined} />
      <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
        <header className="flex items-start gap-4">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-brand-600/10" />
          )}
          <div className="flex-1">
            <h1 className="text-xl font-semibold">
              {profile.displayName ?? profile.username ?? 'Anonymous'}
            </h1>
            {profile.username ? (
              <p className="text-sm text-black/60">@{profile.username}</p>
            ) : null}
            {profile.bio ? <p className="mt-2 text-sm">{profile.bio}</p> : null}
          </div>
          {isSelf ? (
            <a
              href="/settings/profile"
              className="rounded-lg bg-white px-3 py-2 text-xs font-medium ring-1 ring-black/10 hover:bg-black/5"
            >
              Edit
            </a>
          ) : userId ? (
            <FollowButton viewerId={userId} targetId={profile.id} />
          ) : null}
        </header>

        <section className="grid grid-cols-4 gap-2 rounded-xl bg-white p-4 text-center text-sm shadow-sm ring-1 ring-black/5">
          <Stat label="Followers" value={stats.followersCount} href={`/u/${username}/followers`} />
          <Stat label="Following" value={stats.followingCount} href={`/u/${username}/following`} />
          <Stat label="Reports" value={stats.reportsCount} />
          <Stat label="Cleaned" value={stats.cleanupsCount} />
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const inner = (
    <div>
      <div className="text-lg font-semibold">{value}</div>
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
