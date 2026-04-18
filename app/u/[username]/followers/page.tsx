import { getProfileByUsername, listFollowers } from '@plogg/supabase';
import { notFound } from 'next/navigation';
import { TopNav } from '@/components/nav';
import { ProfileList } from '@/components/profile-list';
import { getSupabaseServer } from '@/lib/supabase/server';

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await getSupabaseServer();
  if (!supabase) notFound();
  const profile = await getProfileByUsername(supabase, username);
  if (!profile) notFound();
  const followers = await listFollowers(supabase, profile.id);

  return (
    <main className="min-h-screen bg-neutral-50">
      <TopNav />
      <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
        <h1 className="text-lg font-semibold">
          Followers of @{profile.username ?? profile.id}
        </h1>
        <ProfileList profiles={followers} emptyLabel="No followers yet." />
      </div>
    </main>
  );
}
