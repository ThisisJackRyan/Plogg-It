'use client';

import { useUser } from '@clerk/nextjs';
import {
  useAddComment,
  useComments,
  useDeleteComment,
} from '@plogg/supabase';
import type { FeedEventType, Hotspot } from '@plogg/types';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { useSupabaseBrowser } from '@/lib/supabase/browser';

export function EventDetail({
  hotspot,
  eventType,
}: {
  hotspot: Hotspot;
  eventType: FeedEventType;
}) {
  const supabase = useSupabaseBrowser();
  const { user } = useUser();
  const key = { hotspotId: hotspot.id, eventType };
  const { data: comments, isLoading } = useComments(supabase, key);
  const addComment = useAddComment(supabase, user?.id ?? '');
  const deleteComment = useDeleteComment(supabase);

  const [body, setBody] = useState('');

  const actorName =
    eventType === 'cleanup'
      ? hotspot.cleanerDisplayName ?? 'Anonymous'
      : hotspot.reporterDisplayName ?? 'Anonymous';
  const photoUrl =
    eventType === 'cleanup' && hotspot.cleanupPhotoUrl ? hotspot.cleanupPhotoUrl : hotspot.photoUrl;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || !user) return;
    await addComment.mutateAsync({
      hotspotId: hotspot.id,
      eventType,
      body: trimmed,
    });
    setBody('');
  }

  return (
    <div className="space-y-6">
      <article className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt="" className="aspect-video w-full object-cover" />
        <div className="space-y-2 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/50">
            {eventType === 'cleanup' ? 'Cleaned' : 'Reported'} · by {actorName}
          </p>
          <p className="text-sm">{hotspot.description}</p>
        </div>
      </article>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Comments</h2>

        {isLoading ? (
          <p className="text-sm opacity-60">Loading…</p>
        ) : comments && comments.length > 0 ? (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li
                key={c.id}
                className="flex gap-3 rounded-lg bg-white p-3 text-sm shadow-sm ring-1 ring-black/5"
              >
                {c.authorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.authorAvatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-brand-600/10" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">
                    {c.authorDisplayName ?? c.authorUsername ?? 'Anonymous'}
                  </p>
                  <p className="whitespace-pre-wrap">{c.body}</p>
                </div>
                {c.authorId === user?.id ? (
                  <button
                    type="button"
                    onClick={() => deleteComment.mutate(c.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-60">No comments yet.</p>
        )}

        {user ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="Say something nice…"
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
            />
            <Button type="submit" disabled={addComment.isPending || !body.trim()}>
              {addComment.isPending ? 'Posting…' : 'Post comment'}
            </Button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
