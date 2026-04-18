import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
  type InfiniteData,
} from '@tanstack/react-query';
import type {
  Comment,
  CommentInsert,
  EventKey,
  FeedEvent,
  Profile,
  ProfileStats,
  ProfileUpdate,
} from '@plogg/types';
import type { SupabaseClient } from '../client';
import {
  addComment,
  deleteComment,
  listComments,
} from '../queries/comments';
import { getFeed } from '../queries/feed';
import {
  follow,
  isFollowing,
  listFollowers,
  listFollowing,
  unfollow,
} from '../queries/follows';
import { addKudos, removeKudos } from '../queries/kudos';
import {
  getProfileById,
  getProfileByUsername,
  getProfileStats,
  listProfiles,
  updateProfile,
} from '../queries/profiles';

const FEED_KEY = ['feed'] as const;
const PROFILE_KEY = ['profile'] as const;
const FOLLOWS_KEY = ['follows'] as const;
const COMMENTS_KEY = ['comments'] as const;

// ---- Feed ------------------------------------------------------------------

export function useFeed(
  client: SupabaseClient,
  pageSize = 20,
): UseInfiniteQueryResult<InfiniteData<FeedEvent[]>, Error> {
  return useInfiniteQuery({
    queryKey: [...FEED_KEY, pageSize],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => getFeed(client, { pageSize, before: pageParam }),
    getNextPageParam: (last) =>
      last.length < pageSize ? undefined : last[last.length - 1]?.eventAt ?? undefined,
    staleTime: 30_000,
  });
}

// ---- Profiles --------------------------------------------------------------

export function useProfileByUsername(
  client: SupabaseClient,
  username: string | null,
): UseQueryResult<Profile | null, Error> {
  return useQuery({
    queryKey: [...PROFILE_KEY, 'username', username],
    enabled: Boolean(username),
    queryFn: () => getProfileByUsername(client, username!),
  });
}

export function useProfileById(
  client: SupabaseClient,
  id: string | null,
): UseQueryResult<Profile | null, Error> {
  return useQuery({
    queryKey: [...PROFILE_KEY, 'id', id],
    enabled: Boolean(id),
    queryFn: () => getProfileById(client, id!),
  });
}

export function useProfileStats(
  client: SupabaseClient,
  userId: string | null,
): UseQueryResult<ProfileStats, Error> {
  return useQuery({
    queryKey: [...PROFILE_KEY, 'stats', userId],
    enabled: Boolean(userId),
    queryFn: () => getProfileStats(client, userId!),
  });
}

export function useProfiles(
  client: SupabaseClient,
  opts: { search?: string; excludeUserId?: string | null; limit?: number } = {},
): UseQueryResult<Profile[], Error> {
  const { search, excludeUserId, limit } = opts;
  return useQuery({
    queryKey: [...PROFILE_KEY, 'list', { search: search ?? '', excludeUserId, limit }],
    queryFn: () => listProfiles(client, { search, excludeUserId, limit }),
    staleTime: 30_000,
  });
}

export function useUpdateProfile(
  client: SupabaseClient,
  userId: string,
): UseMutationResult<Profile, Error, ProfileUpdate> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (update) => updateProfile(client, userId, update),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
}

// ---- Follows ---------------------------------------------------------------

export function useIsFollowing(
  client: SupabaseClient,
  followerId: string | null,
  followeeId: string | null,
): UseQueryResult<boolean, Error> {
  return useQuery({
    queryKey: [...FOLLOWS_KEY, 'pair', followerId, followeeId],
    enabled: Boolean(followerId) && Boolean(followeeId) && followerId !== followeeId,
    queryFn: () => isFollowing(client, followerId!, followeeId!),
  });
}

export function useFollowers(
  client: SupabaseClient,
  userId: string | null,
): UseQueryResult<Profile[], Error> {
  return useQuery({
    queryKey: [...FOLLOWS_KEY, 'followers', userId],
    enabled: Boolean(userId),
    queryFn: () => listFollowers(client, userId!),
  });
}

export function useFollowing(
  client: SupabaseClient,
  userId: string | null,
): UseQueryResult<Profile[], Error> {
  return useQuery({
    queryKey: [...FOLLOWS_KEY, 'following', userId],
    enabled: Boolean(userId),
    queryFn: () => listFollowing(client, userId!),
  });
}

export function useFollow(
  client: SupabaseClient,
  followerId: string,
): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (followeeId) => follow(client, followerId, followeeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FOLLOWS_KEY });
      qc.invalidateQueries({ queryKey: FEED_KEY });
      qc.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
}

export function useUnfollow(
  client: SupabaseClient,
  followerId: string,
): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (followeeId) => unfollow(client, followerId, followeeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FOLLOWS_KEY });
      qc.invalidateQueries({ queryKey: FEED_KEY });
      qc.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
}

// ---- Kudos -----------------------------------------------------------------

export function useKudos(
  client: SupabaseClient,
  userId: string,
): {
  add: UseMutationResult<void, Error, EventKey>;
  remove: UseMutationResult<void, Error, EventKey>;
} {
  const qc = useQueryClient();
  const add = useMutation({
    mutationFn: (key: EventKey) => addKudos(client, userId, key),
    onSuccess: () => qc.invalidateQueries({ queryKey: FEED_KEY }),
  });
  const remove = useMutation({
    mutationFn: (key: EventKey) => removeKudos(client, userId, key),
    onSuccess: () => qc.invalidateQueries({ queryKey: FEED_KEY }),
  });
  return { add, remove };
}

// ---- Comments --------------------------------------------------------------

export function useComments(
  client: SupabaseClient,
  key: EventKey | null,
): UseQueryResult<Comment[], Error> {
  return useQuery({
    queryKey: [...COMMENTS_KEY, key?.hotspotId, key?.eventType],
    enabled: Boolean(key),
    queryFn: () => listComments(client, key!),
  });
}

export function useAddComment(
  client: SupabaseClient,
  authorId: string,
): UseMutationResult<Comment, Error, CommentInsert> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => addComment(client, authorId, input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: [...COMMENTS_KEY, vars.hotspotId, vars.eventType],
      });
      qc.invalidateQueries({ queryKey: FEED_KEY });
    },
  });
}

export function useDeleteComment(
  client: SupabaseClient,
): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId) => deleteComment(client, commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COMMENTS_KEY });
      qc.invalidateQueries({ queryKey: FEED_KEY });
    },
  });
}
