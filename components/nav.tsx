import { UserButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';

/** Compact top nav shown on the full-screen pages (feed, profile, settings). */
export async function TopNav({
  active,
}: {
  active?: 'map' | 'routes' | 'feed' | 'people' | 'profile' | 'leaderboard';
}) {
  const user = await currentUser();

  const link = (
    href: string,
    label: string,
    key: 'map' | 'routes' | 'feed' | 'people' | 'profile' | 'leaderboard',
  ) => (
    <Link
      key={key}
      href={href}
      className={`rounded-full px-1.5 py-1.5 text-[11px] font-semibold min-[400px]:px-2 sm:px-3 sm:py-2 sm:text-sm ${
        active === key ? 'bg-brand-600 text-white' : 'text-black/70 hover:bg-black/5'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-1 border-b border-black/5 bg-white/90 px-2 py-2 backdrop-blur sm:gap-2 sm:px-4">
      <Link
        href="/"
        className="shrink-0 text-sm font-semibold sm:text-base"
        aria-label="Plogg Club home"
      >
        <span className="hidden sm:inline">Plogg Club</span>
        <span className="hidden min-[380px]:inline sm:hidden">Plogg</span>
      </Link>
      <nav className="flex min-w-0 items-center gap-0.5 sm:gap-1">
        {link('/', 'Map', 'map')}
        {link('/routes', 'Routes', 'routes')}
        {link('/feed', 'Feed', 'feed')}
        {link('/people', 'People', 'people')}
        {link('/leaderboard', 'Top', 'leaderboard')}
        {link('/me', 'Profile', 'profile')}
      </nav>
      <div className="flex shrink-0 items-center">
        {user ? <UserButton afterSignOutUrl="/sign-in" /> : null}
      </div>
    </header>
  );
}
