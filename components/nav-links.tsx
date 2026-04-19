'use client';

import { LayoutGroup, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useState } from 'react';

export type NavKey = 'map' | 'routes' | 'feed' | 'people' | 'profile' | 'leaderboard';

function deriveActive(pathname: string | null, selfProfilePath: string): NavKey | undefined {
  if (!pathname) return undefined;
  if (pathname === '/') return 'map';
  if (pathname.startsWith('/routes')) return 'routes';
  if (pathname.startsWith('/feed')) return 'feed';
  if (pathname.startsWith('/people')) return 'people';
  if (pathname.startsWith('/leaderboard')) return 'leaderboard';
  if (pathname === selfProfilePath || pathname.startsWith('/settings/profile')) return 'profile';
  if (selfProfilePath && pathname.startsWith(`${selfProfilePath}/`)) return 'profile';
  if (pathname.startsWith('/u/')) return 'people';
  return undefined;
}

const items: ReadonlyArray<{ key: NavKey; href: string; label: string }> = [
  { key: 'map', href: '/', label: 'Map' },
  { key: 'routes', href: '/routes', label: 'Routes' },
  { key: 'feed', href: '/feed', label: 'Feed' },
  { key: 'people', href: '/people', label: 'People' },
  { key: 'leaderboard', href: '/leaderboard', label: 'Top' },
  { key: 'profile', href: '', label: 'Profile' },
];

const STORAGE_KEY = 'plogg-nav-active';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function NavLinks({ profileHref }: { profileHref: string }) {
  const pathname = usePathname();
  const active = deriveActive(pathname, profileHref);
  const [rendered, setRendered] = useState<NavKey | undefined>(active);

  // Before paint on the client, if the previous route had a different active tab,
  // render the pill at that previous tab so the post-paint re-render below
  // animates it sliding into the new tab.
  useIsomorphicLayoutEffect(() => {
    const prev = window.sessionStorage.getItem(STORAGE_KEY) as NavKey | null;
    if (prev && prev !== active) {
      setRendered(prev);
    } else {
      setRendered(active);
    }
  }, [active]);

  useEffect(() => {
    if (rendered !== active) setRendered(active);
    if (active) window.sessionStorage.setItem(STORAGE_KEY, active);
    // We only want to trigger the slide after the initial paint, not every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <nav className="flex min-w-0 items-center gap-0.5 sm:gap-1">
      <LayoutGroup>
        {items.map(({ key, href, label }) => {
          const realHref = key === 'profile' ? profileHref : href;
          const isActive = rendered === key;
          return (
            <Link
              key={key}
              href={realHref}
              className="relative rounded-full px-1.5 py-1.5 text-[11px] font-semibold transition-transform duration-200 active:scale-[0.95] min-[400px]:px-2 sm:px-3 sm:py-2 sm:text-sm"
            >
              {isActive ? (
                <motion.span
                  layoutId="nav-active-pill"
                  className="absolute inset-0 rounded-full bg-brand-600 shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              ) : null}
              <span
                className={`relative z-10 transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-black/70 hover:text-black'
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </LayoutGroup>
    </nav>
  );
}
