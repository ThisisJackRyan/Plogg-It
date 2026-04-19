import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { PageTransition } from '@/components/motion';
import { MarketplaceClient, type Reward } from '@/components/marketplace-client';

export const dynamic = 'force-dynamic';

export default async function MarketplacePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = await getSupabaseServer();
  if (!supabase) redirect('/sign-in');

  const [rewardsRes, statsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('rewards')
      .select('id, brand, title, description, image_url, accent_color, cost_points, face_value_cents, currency')
      .eq('active', true)
      .order('sort_order', { ascending: true }),
    supabase.from('user_stats').select('total_points').eq('id', userId).maybeSingle(),
  ]);

  if (rewardsRes.error) throw rewardsRes.error;

  const rewards = ((rewardsRes.data ?? []) as unknown) as Reward[];
  const initialBalance = statsRes.data?.total_points ?? 0;

  return (
    <main className="flex-1 bg-neutral-50">
      <PageTransition className="mx-auto max-w-5xl px-4 py-8">
        <MarketplaceClient rewards={rewards} initialBalance={initialBalance} />
      </PageTransition>
    </main>
  );
}
