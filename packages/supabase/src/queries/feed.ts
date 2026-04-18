import type { FeedEvent, FeedEventType } from '@plogg/types';
import type { SupabaseClient } from '../client';

type AnyClient = { rpc: (fn: string, args?: Record<string, unknown>) => any };

type FeedRow = {
  hotspot_id: string;
  event_type: string;
  actor_id: string;
  actor_username: string | null;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
  event_at: string;
  description: string;
  difficulty: number;
  photo_url: string;
  status: string;
  lat: number;
  lng: number;
  kudos_count: number;
  comment_count: number;
  has_kudoed: boolean;
};

function mapFeedRow(row: FeedRow): FeedEvent {
  return {
    hotspotId: row.hotspot_id,
    eventType: row.event_type as FeedEventType,
    actorId: row.actor_id,
    actorUsername: row.actor_username,
    actorDisplayName: row.actor_display_name,
    actorAvatarUrl: row.actor_avatar_url,
    eventAt: row.event_at,
    description: row.description,
    difficulty: row.difficulty,
    photoUrl: row.photo_url,
    status: row.status as FeedEvent['status'],
    lat: row.lat,
    lng: row.lng,
    kudosCount: row.kudos_count ?? 0,
    commentCount: row.comment_count ?? 0,
    hasKudoed: Boolean(row.has_kudoed),
  };
}

export interface FeedPageInput {
  pageSize?: number;
  before?: string | null;
}

export async function getFeed(
  client: SupabaseClient,
  { pageSize = 20, before = null }: FeedPageInput = {},
): Promise<FeedEvent[]> {
  const c = client as unknown as AnyClient;
  const { data, error } = await c.rpc('feed_for_user', {
    page_size: pageSize,
    before,
  });
  if (error) throw error;
  return ((data ?? []) as FeedRow[]).map(mapFeedRow);
}
