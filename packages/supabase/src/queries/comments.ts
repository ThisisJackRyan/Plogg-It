import type { Comment, CommentInsert, EventKey, FeedEventType } from '@plogg/types';
import type { SupabaseClient } from '../client';

type AnyClient = { from: (t: string) => any };

type CommentRow = {
  id: string;
  hotspot_id: string;
  event_type: string;
  author_id: string;
  body: string;
  created_at: string;
  author: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

const SELECT =
  'id, hotspot_id, event_type, author_id, body, created_at,' +
  ' author:profiles!comments_author_id_fkey(id, username, display_name, avatar_url)';

function mapComment(row: CommentRow): Comment {
  return {
    id: row.id,
    hotspotId: row.hotspot_id,
    eventType: row.event_type as FeedEventType,
    authorId: row.author_id,
    authorUsername: row.author?.username ?? null,
    authorDisplayName: row.author?.display_name ?? null,
    authorAvatarUrl: row.author?.avatar_url ?? null,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function listComments(
  client: SupabaseClient,
  { hotspotId, eventType }: EventKey,
): Promise<Comment[]> {
  const c = client as unknown as AnyClient;
  const { data, error } = await c
    .from('comments')
    .select(SELECT)
    .eq('hotspot_id', hotspotId)
    .eq('event_type', eventType)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as CommentRow[]).map(mapComment);
}

export async function addComment(
  client: SupabaseClient,
  authorId: string,
  input: CommentInsert,
): Promise<Comment> {
  const c = client as unknown as AnyClient;
  const { data, error } = await c
    .from('comments')
    .insert({
      hotspot_id: input.hotspotId,
      event_type: input.eventType,
      author_id: authorId,
      body: input.body,
    })
    .select(SELECT)
    .single();
  if (error) throw error;
  if (!data) throw new Error('Comment insert returned no row.');
  return mapComment(data as CommentRow);
}

export async function deleteComment(
  client: SupabaseClient,
  commentId: string,
): Promise<void> {
  const c = client as unknown as AnyClient;
  const { error } = await c.from('comments').delete().eq('id', commentId);
  if (error) throw error;
}
