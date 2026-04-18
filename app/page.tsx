import { Suspense } from 'react';
import { PloggMap } from '@/components/map';
import { HomeFabs } from '@/components/home-fabs';

export default async function HomePage() {
  return (
    <main className="relative flex-1 overflow-hidden">
      <Suspense fallback={null}>
        <PloggMap />
      </Suspense>
      <HomeFabs />
    </main>
  );
}
