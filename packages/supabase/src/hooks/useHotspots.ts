import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  BoundingBox,
  Hotspot,
  HotspotInsert,
  HotspotStatusFilter,
} from '@plogg/types';
import type { SupabaseClient } from '../client';
import {
  cleanupHotspot,
  getHotspot,
  insertHotspot,
  listHotspotsInBbox,
  type CleanupHotspotInput,
  type InsertHotspotCaller,
} from '../queries/hotspots';

const HOTSPOTS_KEY = ['hotspots'] as const;

export function useHotspotsInBbox(
  client: SupabaseClient,
  bbox: BoundingBox | null,
  filter: HotspotStatusFilter = 'all',
): UseQueryResult<Hotspot[], Error> {
  return useQuery({
    queryKey: [...HOTSPOTS_KEY, 'bbox', filter, bbox],
    enabled: bbox !== null,
    staleTime: 30_000,
    queryFn: () => listHotspotsInBbox(client, bbox!, filter),
  });
}

export function useHotspot(
  client: SupabaseClient,
  id: string | null,
): UseQueryResult<Hotspot | null, Error> {
  return useQuery({
    queryKey: [...HOTSPOTS_KEY, 'detail', id],
    enabled: id !== null,
    queryFn: () => getHotspot(client, id!),
  });
}

export function useInsertHotspot(
  client: SupabaseClient,
  caller: InsertHotspotCaller,
): UseMutationResult<Hotspot, Error, HotspotInsert> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: HotspotInsert) => insertHotspot(client, input, caller),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HOTSPOTS_KEY });
    },
  });
}

export function useCleanupHotspot(
  client: SupabaseClient,
): UseMutationResult<Hotspot, Error, CleanupHotspotInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CleanupHotspotInput) => cleanupHotspot(client, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HOTSPOTS_KEY });
    },
  });
}
