import { Suspense } from 'react';
import { PloggMap } from '@/components/map';
import { HomeFabs } from '@/components/home-fabs';
import { TopNav } from '@/components/nav';

export default async function HomePage() {
  return (
    <main className="flex h-[100dvh] w-full flex-col overflow-hidden">
      <TopNav active="map" />
      <div className="relative flex-1">
        <Suspense fallback={null}>
          <PloggMap />
        </Suspense>
        <HomeFabs />
      </div>
    </main>
  );
}
