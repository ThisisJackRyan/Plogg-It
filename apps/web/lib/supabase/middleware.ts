import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@plogg/types';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '../env';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Per-request session refresh. Keeps the Supabase auth cookies fresh so
 * Server Components see a valid session. Called from `middleware.ts`.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }: CookieToSet) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // This call refreshes the session (sets cookies if needed).
  await supabase.auth.getUser();

  return response;
}
