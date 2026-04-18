import { z } from 'zod';

export const Username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, 'Use 3–20 lowercase letters, numbers, or underscores.');
export type Username = z.infer<typeof Username>;

export const Profile = z.object({
  id: z.string().min(1),
  username: z.string().nullable(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  bio: z.string().nullable(),
  createdAt: z.string(),
});
export type Profile = z.infer<typeof Profile>;

export const ProfileUpdate = z.object({
  username: Username.optional(),
  displayName: z.string().trim().min(1).max(80).optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().trim().max(280).optional(),
});
export type ProfileUpdate = z.infer<typeof ProfileUpdate>;

export const ProfileStats = z.object({
  followersCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  reportsCount: z.number().int().nonnegative(),
  cleanupsCount: z.number().int().nonnegative(),
});
export type ProfileStats = z.infer<typeof ProfileStats>;
