import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  rewardId: z.string().uuid(),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('redeem_reward', {
    p_reward_id: parsed.data.rewardId,
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('insufficient_points')) {
      return NextResponse.json({ error: 'insufficient_points' }, { status: 400 });
    }
    if (msg.includes('reward_not_available')) {
      return NextResponse.json({ error: 'reward_not_available' }, { status: 404 });
    }
    console.error('[marketplace/redeem] rpc error', error);
    return NextResponse.json({ error: 'redeem_failed' }, { status: 500 });
  }

  return NextResponse.json({ redemption: data });
}
