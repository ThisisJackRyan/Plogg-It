import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { PloggMap } from '@/components/map';
import { SignOutButton } from '@/components/sign-out-button';

export default async function HomePage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <PloggMap />

      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
        <div className="pointer-events-auto rounded-full bg-white/90 px-3 py-1 text-sm font-semibold shadow">
          Plogg It
        </div>
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/90 px-2 py-1 shadow">
          <span className="px-2 text-xs opacity-70">{user.email}</span>
          <SignOutButton />
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
