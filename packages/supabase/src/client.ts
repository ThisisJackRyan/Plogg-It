import { createClient, type SupabaseClient as SbClient } from '@supabase/supabase-js';
import type { Database } from '@plogg/types';

export type SupabaseClient = SbClient<Database>;

export interface SupabaseClientOptions {
  url: string;
  anonKey: string;
  /**
   * Platform-specific storage adapter used to persist the auth session.
   * - Web: leave undefined (uses `localStorage`) or pass a cookie adapter for SSR.
   * - React Native: pass `expo-secure-store` or `AsyncStorage` adapter.
   */
  storage?: {
    getItem(key: string): Promise<string | null> | string | null;
    setItem(key: string, value: string): Promise<void> | void;
    removeItem(key: string): Promise<void> | void;
  };
  /**
   * Whether the client should auto-refresh tokens. Default: true.
   * Set false in server-side contexts where the token is passed explicitly.
   */
  autoRefreshToken?: boolean;
  detectSessionInUrl?: boolean;
}

export function createPloggClient(opts: SupabaseClientOptions): SupabaseClient {
  const { url, anonKey, storage, autoRefreshToken = true, detectSessionInUrl = true } = opts;

  return createClient<Database>(url, anonKey, {
    auth: {
      ...(storage ? { storage } : {}),
      autoRefreshToken,
      persistSession: true,
      detectSessionInUrl,
      flowType: 'pkce',
    },
    global: {
      headers: { 'x-plogg-client': 'shared' },
    },
  });
}
