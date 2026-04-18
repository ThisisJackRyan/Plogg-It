import { z } from 'zod';

export const HotspotStatus = z.enum(['active', 'cleaned', 'archived']);
export type HotspotStatus = z.infer<typeof HotspotStatus>;

// Map viewport filter. `null`/`all` returns active + cleaned.
export type HotspotStatusFilter = 'all' | 'active' | 'cleaned';

export const Difficulty = z.number().int().min(1).max(5);

export const HotspotInsert = z.object({
  description: z.string().trim().min(1).max(500),
  difficulty: Difficulty,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  photoUrl: z.string().url(),
});
export type HotspotInsert = z.infer<typeof HotspotInsert>;

export const Hotspot = z.object({
  id: z.string().uuid(),
  reportedBy: z.string().min(1),
  reporterDisplayName: z.string().nullable(),
  description: z.string(),
  difficulty: Difficulty,
  photoUrl: z.string().url(),
  status: HotspotStatus,
  lat: z.number(),
  lng: z.number(),
  createdAt: z.string(),
  cleanedBy: z.string().nullable(),
  cleanerDisplayName: z.string().nullable(),
  cleanedAt: z.string().nullable(),
  cleanupPhotoUrl: z.string().url().nullable(),
});
export type Hotspot = z.infer<typeof Hotspot>;

export const BoundingBox = z.object({
  minLng: z.number(),
  minLat: z.number(),
  maxLng: z.number(),
  maxLat: z.number(),
});
export type BoundingBox = z.infer<typeof BoundingBox>;
