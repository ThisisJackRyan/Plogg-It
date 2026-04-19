'use client';

import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useNavigationPending } from './navigation-pending-context';
import { hasSkeletonFor } from './route-skeletons';

export type NavKey = 'map' | 'routes' | 'feed' | 'people' | 'profile' | 'leaderboard' | 'rewards';

function deriveActive(pathname: string | null, selfProfilePath: string): NavKey | undefined {
  if (!pathname) return undefined;
  if (pathname === '/') return 'map';
  if (pathname.startsWith('/routes')) return 'routes';
  if (pathname.startsWith('/feed')) return 'feed';
  if (pathname.startsWith('/people')) return 'people';
  if (pathname.startsWith('/leaderboard')) return 'leaderboard';
  if (pathname.startsWith('/marketplace')) return 'rewards';
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
  { key: 'rewards', href: '/marketplace', label: 'Rewards' },
  { key: 'profile', href: '', label: 'Profile' },
];

const STORAGE_KEY = 'plogg-nav-active';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function useNavState(profileHref: string) {
  const pathname = usePathname();
  const active = deriveActive(pathname, profileHref);
  const [rendered, setRendered] = useState<NavKey | undefined>(active);
  const { setPending } = useNavigationPending();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const selectOptimistically = (key: NavKey) => {
    if (rendered !== key) setRendered(key);
    window.sessionStorage.setItem(STORAGE_KEY, key);
    if (active !== key && hasSkeletonFor(key)) {
      setPending(key);
    }
  };

  return { pathname, active, rendered, selectOptimistically };
}

export function NavLinks({ profileHref }: { profileHref: string }) {
  const { rendered, selectOptimistically } = useNavState(profileHref);

  return (
    <nav className="hidden min-w-0 items-center gap-0.5 sm:flex sm:gap-1">
      <LayoutGroup>
        {items.map(({ key, href, label }) => {
          const realHref = key === 'profile' ? profileHref : href;
          const isActive = rendered === key;
          const handle = () => selectOptimistically(key);
          return (
            <Link
              key={key}
              href={realHref}
              onClick={handle}
              onTouchStart={handle}
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

export function MobileNav({ profileHref }: { profileHref: string }) {
  const { pathname, rendered, selectOptimistically } = useNavState(profileHref);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        aria-controls="mobile-nav-menu"
        onClick={() => setMenuOpen((v) => !v)}
        className="relative z-40 inline-flex h-9 w-9 items-center justify-center rounded-full text-black/80 hover:bg-black/5 active:scale-[0.95]"
      >
        <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          {menuOpen ? (
            <>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </>
          ) : (
            <>
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </>
          )}
        </svg>
      </button>

      <AnimatePresence>
        {menuOpen ? (
          <>
            <motion.div
              key="mobile-nav-overlay"
              className="fixed inset-0 z-30 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <motion.nav
              key="mobile-nav-menu"
              id="mobile-nav-menu"
              className="fixed inset-x-0 top-[calc(3rem+env(safe-area-inset-top))] z-30 mx-2 flex flex-col gap-1 rounded-2xl border border-black/5 bg-white p-2 shadow-xl"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {items.map(({ key, href, label }) => {
                const realHref = key === 'profile' ? profileHref : href;
                const isActive = rendered === key;
                const handle = () => {
                  selectOptimistically(key);
                  setMenuOpen(false);
                };
                return (
                  <Link
                    key={key}
                    href={realHref}
                    onClick={handle}
                    className={`rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
                      isActive
                        ? 'bg-brand-600 text-white'
                        : 'text-black/80 hover:bg-black/5'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </motion.nav>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
