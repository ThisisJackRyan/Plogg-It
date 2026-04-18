import { UserButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';

/** Compact top nav shown on the full-screen pages (feed, profile, settings). */
export async function TopNav({
  active,
}: {
  active?: 'map' | 'routes' | 'feed' | 'people' | 'profile';
}) {
  const user = await currentUser();

  const link = (
    href: string,
    label: string,
    key: 'map' | 'routes' | 'feed' | 'people' | 'profile',
  ) => (
    <Link
      key={key}
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        active === key ? 'bg-brand-600 text-white' : 'text-black/70 hover:bg-black/5'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-black/5 bg-white/90 px-4 py-2 backdrop-blur">
      <Link href="/" className="text-sm font-semibold">
        Plogg Club
      </Link>
      <nav className="flex items-center gap-1">
        {link('/', 'Map', 'map')}
        {link('/routes', 'Routes', 'routes')}
        {link('/feed', 'Feed', 'feed')}
        {link('/people', 'People', 'people')}
        {link('/me', 'Profile', 'profile')}
      </nav>
      <div className="flex items-center">
        {user ? <UserButton afterSignOutUrl="/sign-in" /> : null}
      </div>
    </header>
  );
}
