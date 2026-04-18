import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@plogg/types';
import { env } from '../env';

/**
 * Singleton browser Supabase client. Cookies are managed by `@supabase/ssr`
 * so the session is shared with the server client.
 */
let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getSupabaseBrowser() {
  if (!client) {
    client = createBrowserClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  }
  return client;
}
