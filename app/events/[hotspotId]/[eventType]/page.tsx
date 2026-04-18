import { getHotspot } from '@plogg/supabase';
import { FeedEventType } from '@plogg/types';
import { notFound } from 'next/navigation';
import { TopNav } from '@/components/nav';
import { EventDetail } from './event-detail';
import { getSupabaseServer } from '@/lib/supabase/server';

export default async function EventPage({
  params,
}: {
  params: Promise<{ hotspotId: string; eventType: string }>;
}) {
  const { hotspotId, eventType } = await params;
  const type = FeedEventType.safeParse(eventType);
  if (!type.success) notFound();

  const supabase = await getSupabaseServer();
  if (!supabase) notFound();
  const hotspot = await getHotspot(supabase, hotspotId);
  if (!hotspot) notFound();
  if (type.data === 'cleanup' && hotspot.status !== 'cleaned') notFound();

  return (
    <main className="min-h-screen bg-neutral-50">
      <TopNav />
      <div className="mx-auto max-w-xl px-4 py-4">
        <EventDetail hotspot={hotspot} eventType={type.data} />
      </div>
    </main>
  );
}
