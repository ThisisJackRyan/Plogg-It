import { createClient, type SupabaseClient as SbClient } from '@supabase/supabase-js';
import type { Database } from '@plogg/types';

export type SupabaseClient = SbClient<Database>;

export interface SupabaseClientOptions {
  url: string;
  anonKey: string;
  /**
   * Returns a Clerk-issued JWT (or null when signed out). When provided,
   * supabase-js injects it as the Authorization header on every request and
   * skips its own session management — this is Supabase's Third-Party Auth
   * contract with Clerk.
   */
  accessToken?: () => Promise<string | null>;
}

export function createPloggClient(opts: SupabaseClientOptions): SupabaseClient {
  const { url, anonKey, accessToken } = opts;

  return createClient<Database>(url, anonKey, {
    ...(accessToken ? { accessToken } : {}),
    global: {
      headers: { 'x-plogg-client': 'shared' },
    },
  });
}
