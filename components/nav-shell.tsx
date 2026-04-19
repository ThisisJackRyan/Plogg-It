'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const HIDE_PREFIXES = ['/sign-in', '/sign-up'];

export function NavShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname && HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  return <>{children}</>;
}
