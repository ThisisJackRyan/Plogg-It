import { auth } from '@clerk/nextjs/server';
import { getProfileById } from '@plogg/supabase';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';

export default async function MyProfileRedirect() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = await getSupabaseServer();
  if (!supabase) redirect('/sign-in');

  const profile = await getProfileById(supabase, userId);
  if (!profile?.username) redirect('/settings/profile');
  redirect(`/u/${profile.username}`);
}
