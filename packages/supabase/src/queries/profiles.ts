import type { Profile, ProfileStats, ProfileUpdate, UserStats } from '@plogg/types';
import type { SupabaseClient } from '../client';

// The generated Database type lags the social schema; cast through `any`
// at the query boundary so we can use typed result rows below.
type AnyClient = {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
};

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

export async function getProfileById(
  client: SupabaseClient,
  id: string,
): Promise<Profile | null> {
  const c = client as unknown as AnyClient;
  const { data, error } = await c
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProfile(data as ProfileRow) : null;
}

export async function listProfiles(
  client: SupabaseClient,
  opts: { search?: string; excludeUserId?: string | null; limit?: number } = {},
): Promise<Profile[]> {
  const c = client as unknown as AnyClient;
  const limit = opts.limit ?? 50;
  let q = c
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .not('username', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (opts.excludeUserId) q = q.neq('id', opts.excludeUserId);
  if (opts.search && opts.search.trim()) {
    // Escape LIKE wildcards, then escape backslashes and double-quotes so we can
    // wrap the value in double quotes inside PostgREST's .or() filter — that way
    // commas, parens, etc. in the term don't break the filter grammar.
    const term = opts.search
      .trim()
      .replace(/[%_]/g, '\\$&')
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
    q = q.or(`username.ilike."%${term}%",display_name.ilike."%${term}%"`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as ProfileRow[]).map(mapProfile);
}

export async function getProfileByUsername(
  client: SupabaseClient,
  username: string,
): Promise<Profile | null> {
  const c = client as unknown as AnyClient;
  const { data, error } = await c
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('username', username)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProfile(data as ProfileRow) : null;
}

export async function updateProfile(
  client: SupabaseClient,
  userId: string,
  update: ProfileUpdate,
): Promise<Profile> {
  const patch: Partial<ProfileRow> = {};
  if (update.username !== undefined) patch.username = update.username;
  if (update.displayName !== undefined) patch.display_name = update.displayName;
  if (update.avatarUrl !== undefined) patch.avatar_url = update.avatarUrl;
  if (update.bio !== undefined) patch.bio = update.bio;

  const c = client as unknown as AnyClient;
  const { data, error } = await c
    .from('profiles')
    .upsert({ id: userId, ...patch }, { onConflict: 'id' })
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw error;
  if (!data) throw new Error('Profile update returned no row.');
  return mapProfile(data as ProfileRow);
}

export async function getProfileStats(
  client: SupabaseClient,
  userId: string,
): Promise<ProfileStats> {
  const c = client as unknown as AnyClient;
  const { data, error } = await c.rpc('profile_stats', { user_id: userId });
  if (error) throw error;
  const rows = data as
    | Array<{
        followers_count: number;
        following_count: number;
        reports_count: number;
        cleanups_count: number;
      }>
    | null;
  const row = rows?.[0];
  return {
    followersCount: row?.followers_count ?? 0,
    followingCount: row?.following_count ?? 0,
    reportsCount: row?.reports_count ?? 0,
    cleanupsCount: row?.cleanups_count ?? 0,
  };
}

export async function getUserStats(
  client: SupabaseClient,
  userId: string,
): Promise<UserStats | null> {
  const c = client as unknown as AnyClient;
  const { data, error } = await c
    .from('user_stats')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data as UserStats | null) ?? null;
}
