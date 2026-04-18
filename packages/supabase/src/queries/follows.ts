import type { Profile } from '@plogg/types';
import type { SupabaseClient } from '../client';

type AnyClient = { from: (t: string) => any };

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

const PROFILE_COLUMNS = 'id, username, display_name, avatar_url, bio, created_at';

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    createdAt: row.created_at,
  };
}

export async function follow(
  client: SupabaseClient,
  followerId: string,
  followeeId: string,
): Promise<void> {
  const c = client as unknown as AnyClient;
  const { error } = await c
    .from('follows')
    .upsert(
      { follower_id: followerId, followee_id: followeeId },
      { onConflict: 'follower_id,followee_id', ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function unfollow(
  client: SupabaseClient,
  followerId: string,
  followeeId: string,
): Promise<void> {
  const c = client as unknown as AnyClient;
  const { error } = await c
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('followee_id', followeeId);
  if (error) throw error;
}

export async function isFollowing(
  client: SupabaseClient,
  followerId: string,
  followeeId: string,
): Promise<boolean> {
  const c = client as unknown as AnyClient;
  const { data, error } = await c
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('followee_id', followeeId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/** Profiles who follow `userId`. */
export async function listFollowers(
  client: SupabaseClient,
  userId: string,
): Promise<Profile[]> {
  const c = client as unknown as AnyClient;
  const { data, error } = await c
    .from('follows')
    .select(`follower:profiles!follows_follower_id_fkey(${PROFILE_COLUMNS})`)
    .eq('followee_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Array<{ follower: ProfileRow | null }>)
    .map((r) => r.follower)
    .filter((p): p is ProfileRow => p !== null)
    .map(mapProfile);
}

/** Profiles `userId` follows. */
export async function listFollowing(
  client: SupabaseClient,
  userId: string,
): Promise<Profile[]> {
  const c = client as unknown as AnyClient;
  const { data, error } = await c
    .from('follows')
    .select(`followee:profiles!follows_followee_id_fkey(${PROFILE_COLUMNS})`)
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Array<{ followee: ProfileRow | null }>)
    .map((r) => r.followee)
    .filter((p): p is ProfileRow => p !== null)
    .map(mapProfile);
}
