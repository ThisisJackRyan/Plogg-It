import { Suspense } from 'react';
import { currentUser } from '@clerk/nextjs/server';
import { PloggMap } from '@/components/map';
import { HomeFabs } from '@/components/home-fabs';
import { TopNav } from '@/components/nav';
import { LandingPage } from '@/components/landing';

export default async function HomePage() {
  const user = await currentUser();

  if (!user) {
    return <LandingPage />;
  }

  return (
    <main className="relative flex-1 overflow-hidden">
      <Suspense fallback={null}>
        <PloggMap />
      </Suspense>
      <HomeFabs />
    </main>
  );
}
