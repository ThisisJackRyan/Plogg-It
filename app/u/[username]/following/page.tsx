import { getProfileByUsername, listFollowing } from '@plogg/supabase';
import { notFound } from 'next/navigation';
import { ProfileList } from '@/components/profile-list';
import { getSupabaseServer } from '@/lib/supabase/server';

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await getSupabaseServer();
  if (!supabase) notFound();
  const profile = await getProfileByUsername(supabase, username);
  if (!profile) notFound();
  const following = await listFollowing(supabase, profile.id);

  return (
    <main className="flex-1 bg-neutral-50">
      <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
        <h1 className="text-lg font-semibold">
          Following by @{profile.username ?? profile.id}
        </h1>
        <ProfileList profiles={following} emptyLabel="Not following anyone yet." />
      </div>
    </main>
  );
}
