import { UserButton } from '@clerk/nextjs';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getProfileById } from '@plogg/supabase';
import Link from 'next/link';
import { getSupabaseServer } from '@/lib/supabase/server';
import { NavLinks } from '@/components/nav-links';

export async function TopNav() {
  const [user, { userId }, supabase] = await Promise.all([
    currentUser(),
    auth(),
    getSupabaseServer(),
  ]);

  let profileHref = '/me';
  if (userId && supabase) {
    const profile = await getProfileById(supabase, userId);
    profileHref = profile?.username ? `/u/${profile.username}` : '/settings/profile';
  }

  return (
    <header className="sticky top-0 z-20 flex min-h-[calc(3rem+env(safe-area-inset-top))] items-center justify-between gap-1 border-b border-black/5 bg-white/90 pt-[env(safe-area-inset-top)] pl-[calc(env(safe-area-inset-left)+0.5rem)] pr-[calc(env(safe-area-inset-right)+0.5rem)] backdrop-blur sm:gap-2 sm:pl-[calc(env(safe-area-inset-left)+1rem)] sm:pr-[calc(env(safe-area-inset-right)+1rem)]">
      <Link
        href="/"
        className="shrink-0 text-sm font-semibold sm:text-base"
        aria-label="Plogg Club home"
      >
        <span className="hidden sm:inline">Plogg Club</span>
        <span className="hidden min-[380px]:inline sm:hidden">Plogg</span>
      </Link>
      <NavLinks profileHref={profileHref} />
      <div className="flex shrink-0 items-center">
        {user ? <UserButton afterSignOutUrl="/" /> : null}
      </div>
    </header>
  );
}
