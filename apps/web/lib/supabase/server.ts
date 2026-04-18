import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@plogg/types';
import { cookies } from 'next/headers';
import { env } from '../env';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Server Supabase client. Use this in Route Handlers, Server Components, and
 * Server Actions. Cookie mutation is a no-op in Server Components — only
 * Route Handlers / Server Actions can actually set cookies.
 */
export async function getSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — Next.js throws here, which is
          // expected. The browser will pick up the refreshed cookie on the
          // next request-response cycle via the middleware.
        }
      },
    },
  });
}
