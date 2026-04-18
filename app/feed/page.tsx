import { TopNav } from '@/components/nav';
import { FeedList } from './feed-list';

export default function FeedPage() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <TopNav active="feed" />
      <div className="mx-auto max-w-xl px-4 py-4">
        <FeedList />
      </div>
    </main>
  );
}
