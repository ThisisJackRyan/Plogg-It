import { PageTransition } from '@/components/motion';
import { PeopleBrowser } from './people-browser';

export default function PeoplePage() {
  return (
    <main className="flex-1 bg-neutral-50">
      <PageTransition className="mx-auto max-w-xl px-4 py-4">
        <h1 className="mb-3 text-lg font-semibold">Find ploggers</h1>
        <PeopleBrowser />
      </PageTransition>
    </main>
  );
}
