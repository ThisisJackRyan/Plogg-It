import { useAuth } from '@clerk/clerk-expo';
import { createPloggClient, type SupabaseClient } from '@plogg/supabase';
import { useMemo } from 'react';
import { env } from './env';

/**
 * Supabase client bound to the current Clerk session. Must be used inside a
 * component tree wrapped by `<ClerkProvider>`. Each Supabase request pulls a
 * fresh Clerk JWT via `getToken()`.
 */
export function useSupabase(): SupabaseClient {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createPloggClient({
        url: env.SUPABASE_URL,
        anonKey: env.SUPABASE_ANON_KEY,
        accessToken: async () => (await getToken()) ?? null,
      }),
    [getToken],
  );
}
