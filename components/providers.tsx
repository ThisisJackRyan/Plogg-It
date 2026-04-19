'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { RouteSessionProvider } from './route-session-context';
import { NavigationPendingProvider } from './navigation-pending-context';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RouteSessionProvider>
        <NavigationPendingProvider>{children}</NavigationPendingProvider>
      </RouteSessionProvider>
    </QueryClientProvider>
  );
}
