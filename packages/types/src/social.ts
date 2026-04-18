import { z } from 'zod';

export const FeedEventType = z.enum(['report', 'cleanup']);
export type FeedEventType = z.infer<typeof FeedEventType>;

export const FeedEvent = z.object({
  hotspotId: z.string().uuid(),
  eventType: FeedEventType,
  actorId: z.string().min(1),
  actorUsername: z.string().nullable(),
  actorDisplayName: z.string().nullable(),
  actorAvatarUrl: z.string().url().nullable(),
  eventAt: z.string(),
  description: z.string(),
  difficulty: z.number().int().min(1).max(5),
  photoUrl: z.string().url(),
  status: z.enum(['active', 'cleaned', 'archived']),
  lat: z.number(),
  lng: z.number(),
  kudosCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  hasKudoed: z.boolean(),
});
export type FeedEvent = z.infer<typeof FeedEvent>;

export const Comment = z.object({
  id: z.string().uuid(),
  hotspotId: z.string().uuid(),
  eventType: FeedEventType,
  authorId: z.string().min(1),
  authorUsername: z.string().nullable(),
  authorDisplayName: z.string().nullable(),
  authorAvatarUrl: z.string().url().nullable(),
  body: z.string(),
  createdAt: z.string(),
});
export type Comment = z.infer<typeof Comment>;

export const CommentInsert = z.object({
  hotspotId: z.string().uuid(),
  eventType: FeedEventType,
  body: z.string().trim().min(1).max(1000),
});
export type CommentInsert = z.infer<typeof CommentInsert>;

export interface EventKey {
  hotspotId: string;
  eventType: FeedEventType;
}
