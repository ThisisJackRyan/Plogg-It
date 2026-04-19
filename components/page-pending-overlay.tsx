'use client';

import type { ReactNode } from 'react';
import { useNavigationPending } from './navigation-pending-context';
import { RouteSkeletonFor, hasSkeletonFor } from './route-skeletons';

export function PagePendingOverlay({ children }: { children: ReactNode }) {
  const { pendingKey } = useNavigationPending();
  if (pendingKey && hasSkeletonFor(pendingKey)) {
    return <RouteSkeletonFor navKey={pendingKey} />;
  }
  return <>{children}</>;
}
