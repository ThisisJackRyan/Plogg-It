'use client';

import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const HIDE_PREFIXES = ['/sign-in', '/sign-up', '/report', '/cleanup'];

function shouldHide(pathname: string | null): boolean {
  if (!pathname) return false;
  if (HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  // Individual route-detail pages (e.g. /routes/abc123) hide nav; /routes index keeps it.
  if (/^\/routes\/[^/]+$/.test(pathname)) return true;
  return false;
}

export function NavShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return null;
  if (!isSignedIn) return null;
  if (shouldHide(pathname)) return null;
  return <>{children}</>;
}
