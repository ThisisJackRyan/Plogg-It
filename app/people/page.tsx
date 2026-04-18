import { TopNav } from '@/components/nav';
import { PeopleBrowser } from './people-browser';

export default function PeoplePage() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <TopNav active="people" />
      <div className="mx-auto max-w-xl px-4 py-4">
        <h1 className="mb-3 text-lg font-semibold">Find ploggers</h1>
        <PeopleBrowser />
      </div>
    </main>
  );
}
