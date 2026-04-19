import type { NavKey } from './nav-links';

export function FeedSkeleton() {
  return (
    <main className="flex-1 bg-neutral-50">
      <div className="mx-auto max-w-xl px-4 py-4">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
            />
          ))}
        </div>
      </div>
    </main>
  );
}

export function PeopleSkeleton() {
  return (
    <main className="flex-1 bg-neutral-50">
      <div className="mx-auto max-w-xl px-4 py-4">
        <h1 className="mb-3 text-lg font-semibold">Find ploggers</h1>
        <div className="mb-3 h-10 animate-pulse rounded-full bg-white ring-1 ring-black/5" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5"
            >
              <div className="h-10 w-10 animate-pulse rounded-full bg-neutral-200" />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-200" />
                <div className="h-3 w-1/5 animate-pulse rounded bg-neutral-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export function RoutesSkeleton() {
  return (
    <main className="flex-1 bg-neutral-50">
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">My Routes</h1>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
            />
          ))}
        </div>
      </div>
    </main>
  );
}

export function LeaderboardSkeleton() {
  return (
    <main className="flex-1 bg-neutral-50">
      <div className="mx-auto max-w-xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Global Leaderboard</h1>
        <div className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-8 w-8 flex-shrink-0 animate-pulse rounded-full bg-neutral-100" />
              <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-neutral-200" />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-200" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-neutral-100" />
              </div>
              <div className="h-4 w-14 animate-pulse rounded bg-neutral-200" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export function ProfileSkeleton() {
  return (
    <main className="flex-1 bg-neutral-50">
      <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
        <header className="flex flex-wrap items-start gap-3 sm:gap-4">
          <div className="h-14 w-14 animate-pulse rounded-full bg-neutral-200 sm:h-16 sm:w-16" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-5 w-1/3 animate-pulse rounded bg-neutral-200" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-neutral-100" />
          </div>
          <div className="h-9 w-16 shrink-0 animate-pulse rounded-lg bg-white ring-1 ring-black/10" />
        </header>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="h-5 w-10 animate-pulse rounded bg-neutral-200" />
              <div className="h-3 w-16 animate-pulse rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export function RouteSkeletonFor({ navKey }: { navKey: NavKey }) {
  switch (navKey) {
    case 'feed':
      return <FeedSkeleton />;
    case 'people':
      return <PeopleSkeleton />;
    case 'routes':
      return <RoutesSkeleton />;
    case 'leaderboard':
      return <LeaderboardSkeleton />;
    case 'profile':
      return <ProfileSkeleton />;
    default:
      return null;
  }
}

export function hasSkeletonFor(navKey: NavKey | undefined | null): boolean {
  return (
    navKey === 'feed' ||
    navKey === 'people' ||
    navKey === 'routes' ||
    navKey === 'leaderboard' ||
    navKey === 'profile'
  );
}
