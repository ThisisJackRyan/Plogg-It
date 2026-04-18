import { z } from 'zod';

export const Profile = z.object({
  id: z.string().uuid(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  createdAt: z.string(),
});
export type Profile = z.infer<typeof Profile>;

export const ProfileUpdate = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  avatarUrl: z.string().url().optional(),
});
export type ProfileUpdate = z.infer<typeof ProfileUpdate>;
