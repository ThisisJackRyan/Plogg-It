import { PageTransition, StaggerList, StaggerItem } from '@/components/motion';
import { getSupabaseServer } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function LeaderboardPage() {
  const supabase = await getSupabaseServer();
  if (!supabase) notFound();

  const { data: rawData, error } = await supabase
    .from('user_stats')
    .select('*, profiles(username, display_name, avatar_url)')
    .order('total_points', { ascending: false })
    .limit(50);

  if (error) throw error;
  
  // Clean up data based on what supabase-js returns with join
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (rawData as any[]) || [];

  return (
    <main className="flex-1 bg-neutral-50">
      <PageTransition className="mx-auto max-w-xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Global Leaderboard</h1>

        <StaggerList className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {data.map((stat, i) => {
            const profile = stat.profiles || {};
            const name = profile.display_name || profile.username || 'Anonymous';
            return (
              <StaggerItem key={stat.id}>
              <Link
                href={profile.username ? `/u/${profile.username}` : '#'}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-black/5"
              >
                <div className="flex bg-neutral-100 flex-shrink-0 flex-grow-0 items-center justify-center font-bold h-8 w-8 rounded-full text-black/50 text-sm">
                  {i + 1}
                </div>
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 flex-shrink-0 rounded-full bg-brand-600/10" />
                )}
                <div className="flex-1 truncate">
                  <div className="truncate font-medium">{name}</div>
                  <div className="text-xs text-black/60">
                    {stat.current_streak > 0 ? (
                      <span className="mr-2">Streak {stat.current_streak}</span>
                    ) : null}
                    Max streak {stat.longest_streak}
                  </div>
                </div>
                <div className="whitespace-nowrap text-right">
                  <div className="font-semibold text-brand-600">{stat.total_points} pts</div>
                </div>
              </Link>
              </StaggerItem>
            );
          })}
          {data.length === 0 ? (
            <div className="p-8 text-center text-black/60">No points awarded yet.</div>
          ) : null}
        </StaggerList>
      </PageTransition>
    </main>
  );
}