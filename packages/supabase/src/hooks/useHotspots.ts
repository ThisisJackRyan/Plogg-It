import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { BoundingBox, Hotspot, HotspotInsert } from '@plogg/types';
import type { SupabaseClient } from '../client';
import { getHotspot, insertHotspot, listHotspotsInBbox } from '../queries/hotspots';

const HOTSPOTS_KEY = ['hotspots'] as const;

export function useHotspotsInBbox(
  client: SupabaseClient,
  bbox: BoundingBox | null,
): UseQueryResult<Hotspot[], Error> {
  return useQuery({
    queryKey: [...HOTSPOTS_KEY, 'bbox', bbox],
    enabled: bbox !== null,
    staleTime: 30_000,
    queryFn: () => listHotspotsInBbox(client, bbox!),
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
): UseMutationResult<Hotspot, Error, HotspotInsert> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: HotspotInsert) => insertHotspot(client, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HOTSPOTS_KEY });
    },
  });
}
