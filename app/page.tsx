import { UserButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { PloggMap } from '@/components/map';
import { HomeFabs } from '@/components/home-fabs';

export default async function HomePage() {
  // Middleware guards this route, so `currentUser()` always resolves.
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? '';

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <PloggMap />

      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="rounded-full bg-white/90 px-3 py-1 text-sm font-semibold shadow">
            Plogg It
          </div>
          <Link
            href="/routes"
            className="rounded-full bg-white/90 px-3 py-1 text-sm font-semibold shadow hover:bg-white"
          >
            My Routes
          </Link>
        </div>
        <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-white/90 px-1 py-1 shadow">
          <Link
            href="/feed"
            className="rounded-full px-3 py-1 text-xs font-semibold text-black/70 hover:bg-black/5"
          >
            Feed
          </Link>
          <Link
            href="/me"
            className="rounded-full px-3 py-1 text-xs font-semibold text-black/70 hover:bg-black/5"
          >
            Profile
          </Link>
          {email ? <span className="px-2 text-xs opacity-70">{email}</span> : null}
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>

      <HomeFabs />
    </main>
  );
}
