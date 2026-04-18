import { auth, currentUser } from '@clerk/nextjs/server';
import { getProfileById } from '@plogg/supabase';
import { redirect } from 'next/navigation';
import { ProfileSettingsForm } from './form';
import { getSupabaseServer } from '@/lib/supabase/server';

export default async function ProfileSettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = await getSupabaseServer();
  if (!supabase) redirect('/sign-in');

  const [profile, user] = await Promise.all([
    getProfileById(supabase, userId),
    currentUser(),
  ]);

  const fallbackName =
    user?.fullName ?? user?.primaryEmailAddress?.emailAddress?.split('@')[0] ?? '';

  return (
    <main className="flex-1 bg-neutral-50">
      <div className="mx-auto max-w-md space-y-6 px-4 py-6">
        <h1 className="text-xl font-semibold">Your profile</h1>
        <ProfileSettingsForm
          userId={userId}
          initialUsername={profile?.username ?? ''}
          initialDisplayName={profile?.displayName ?? fallbackName}
          initialBio={profile?.bio ?? ''}
          initialAvatarUrl={profile?.avatarUrl ?? user?.imageUrl ?? null}
        />
      </div>
    </main>
  );
}
