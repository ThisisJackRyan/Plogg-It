import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

/**
 * Handles the redirect target for email-verification and password-reset
 * flows. Supabase redirects here with `?code=...`; we exchange the code for
 * a session, which the SSR client stores in secure cookies.
 *
 * `?next=` tells us where to send the user after success.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const errorDescription = url.searchParams.get('error_description');
  const next = url.searchParams.get('next') ?? '/';

  if (errorDescription) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription)}`, url.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', url.origin));
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
