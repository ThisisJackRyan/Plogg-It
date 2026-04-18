import { PageTransition } from '@/components/motion';
import { RoutesList } from './routes-list';

export default function RoutesPage() {
  return (
    <main className="flex-1 bg-neutral-50">
      <PageTransition className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">My Routes</h1>
        <RoutesList />
      </PageTransition>
    </main>
  );
}
