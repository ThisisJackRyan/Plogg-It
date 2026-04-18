'use client';

import { useAuth } from '@clerk/nextjs';
import { createPloggClient, type SupabaseClient } from '@plogg/supabase';
import { useMemo } from 'react';
import { env } from '../env';

/**
 * Browser Supabase client bound to the current Clerk session. Every request
 * pulls a fresh Clerk JWT via `getToken()`; Supabase verifies it through the
 * Third-Party Auth integration.
 *
 * Must be called inside a component tree wrapped by `<ClerkProvider>`.
 */
export function useSupabaseBrowser(): SupabaseClient {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createPloggClient({
        url: env.SUPABASE_URL,
        anonKey: env.SUPABASE_ANON_KEY,
        accessToken: async () => {
          if (typeof getToken !== 'function') return null;
          return (await getToken()) ?? null;
        },
      }),
    [getToken],
  );
}
