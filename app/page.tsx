import { UserButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { PloggMap } from '@/components/map';

export default async function HomePage() {
  // Middleware guards this route, so `currentUser()` always resolves.
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? '';

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <PloggMap />

      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
        <div className="pointer-events-auto rounded-full bg-white/90 px-3 py-1 text-sm font-semibold shadow">
          Plogg It
        </div>
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/90 px-2 py-1 shadow">
          {email ? <span className="px-2 text-xs opacity-70">{email}</span> : null}
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>

      <Link
        href="/report"
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-brand-700"
      >
        + Report trash
      </Link>
    </main>
  );
}
