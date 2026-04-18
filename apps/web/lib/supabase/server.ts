import { auth } from '@clerk/nextjs/server';
import { createPloggClient, type SupabaseClient } from '@plogg/supabase';
import { env } from '../env';

/**
 * Server Supabase client bound to the current Clerk request. Each call to
 * Supabase pulls a fresh Clerk JWT from the server-side auth context.
 * Returns `null` when the caller is not signed in — redirect at the caller.
 */
export async function getSupabaseServer(): Promise<SupabaseClient | null> {
  const { userId, getToken } = await auth();
  if (!userId) return null;

  return createPloggClient({
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    accessToken: async () => (await getToken()) ?? null,
  });
}
