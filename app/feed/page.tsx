import { PageTransition } from '@/components/motion';
import { FeedList } from './feed-list';

export default function FeedPage() {
  return (
    <main className="flex-1 bg-neutral-50">
      <PageTransition className="mx-auto max-w-xl px-4 py-4">
        <FeedList />
      </PageTransition>
    </main>
  );
}
