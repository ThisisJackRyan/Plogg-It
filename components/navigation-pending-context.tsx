'use client';

import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { NavKey } from './nav-links';

type Ctx = {
  pendingKey: NavKey | null;
  setPending: (key: NavKey | null) => void;
};

const NavigationPendingContext = createContext<Ctx | null>(null);

export function NavigationPendingProvider({ children }: { children: ReactNode }) {
  const [pendingKey, setPendingKey] = useState<NavKey | null>(null);
  const pathname = usePathname();

  // Clear pending as soon as the route actually changes — the new route's
  // loading.tsx (or page) takes over from here.
  useEffect(() => {
    setPendingKey(null);
  }, [pathname]);

  const setPending = useCallback((key: NavKey | null) => {
    setPendingKey(key);
  }, []);

  const value = useMemo(() => ({ pendingKey, setPending }), [pendingKey, setPending]);

  return (
    <NavigationPendingContext.Provider value={value}>
      {children}
    </NavigationPendingContext.Provider>
  );
}

export function useNavigationPending(): Ctx {
  const ctx = useContext(NavigationPendingContext);
  if (!ctx) {
    return { pendingKey: null, setPending: () => {} };
  }
  return ctx;
}
