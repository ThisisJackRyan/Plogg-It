import type {
  BoundingBox,
  Hotspot,
  HotspotInsert,
  HotspotStatusFilter,
} from '@plogg/types';
import type { SupabaseClient } from '../client';

/**
 * List hotspots within a viewport bounding box. `filter` controls whether
 * active (to-be-cleaned), cleaned, or both statuses are returned.
 */
export async function listHotspotsInBbox(
  client: SupabaseClient,
  bbox: BoundingBox,
  filter: HotspotStatusFilter = 'all',
): Promise<Hotspot[]> {
  const { data, error } = await client.rpc('hotspots_in_bbox', {
    min_lng: bbox.minLng,
    min_lat: bbox.minLat,
    max_lng: bbox.maxLng,
    max_lat: bbox.maxLat,
    status_filter: filter === 'all' ? undefined : filter,
  });
  if (error) throw error;
  return ((data ?? []) as unknown as RpcRow[]).map(mapRpcRowToHotspot);
}

/**
 * Fetch a single hotspot by id. Returns `null` if not found or hidden by RLS.
 */
export async function getHotspot(
  client: SupabaseClient,
  id: string,
): Promise<Hotspot | null> {
  const { data, error } = await client
    .from('hotspots_public')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapViewRowToHotspot(data as unknown as ViewRow);
}

export interface InsertHotspotCaller {
  userId: string;
  displayName?: string | null;
}

/**
 * Insert a new hotspot. Caller identity is the Clerk user id (passed in
 * explicitly since Supabase-side `auth.getUser()` isn't available under
 * third-party auth). A profile row is upserted defensively so the FK from
 * hotspots.reported_by resolves on first-ever post.
 */
export async function insertHotspot(
  client: SupabaseClient,
  input: HotspotInsert,
  caller: InsertHotspotCaller,
): Promise<Hotspot> {
  const { userId, displayName } = caller;

  const { error: profileError } = await client
    .from('profiles')
    .upsert(
      { id: userId, display_name: displayName ?? null },
      { onConflict: 'id', ignoreDuplicates: true },
    );
  if (profileError) throw profileError;

  const { data, error } = await client
    .from('hotspots')
    .insert({
      reported_by: userId,
      description: input.description,
      difficulty: input.difficulty,
      photo_url: input.photoUrl,
      status: 'active',
      location: `SRID=4326;POINT(${input.lng} ${input.lat})` as unknown as never,
    })
    .select('id, description, difficulty, photo_url, status, created_at')
    .single();
  if (error) throw error;

  return {
    id: data.id,
    reportedBy: userId,
    reporterDisplayName: displayName ?? null,
    description: data.description ?? input.description,
    difficulty: data.difficulty ?? input.difficulty,
    photoUrl: data.photo_url ?? input.photoUrl,
    status: (data.status ?? 'active') as Hotspot['status'],
    lat: input.lat,
    lng: input.lng,
    createdAt: data.created_at,
    cleanedBy: null,
    cleanerDisplayName: null,
    cleanedAt: null,
    cleanupPhotoUrl: null,
  };
}

export interface CleanupHotspotInput {
  hotspotId: string;
  cleanupPhotoUrl: string;
  cleanerDisplayName?: string | null;
}

/**
 * Mark a hotspot as cleaned. Any authed user can call this on an active pin
 * (enforced server-side by the `cleanup_hotspot` RPC). Returns the updated
 * Hotspot as reflected in the `hotspots_public` view.
 */
export async function cleanupHotspot(
  client: SupabaseClient,
  input: CleanupHotspotInput,
): Promise<Hotspot> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any).rpc('cleanup_hotspot', {
    hotspot_id: input.hotspotId,
    cleanup_photo_url: input.cleanupPhotoUrl,
    cleaner_display_name: input.cleanerDisplayName ?? null,
  });
  if (error) throw error;
  if (!data) throw new Error('Cleanup returned no row.');
  // RPC returns a single composite row; supabase-js types it as array-or-object.
  const row = Array.isArray(data) ? data[0] : data;
  return mapViewRowToHotspot(row as ViewRow);
}

// ---- mappers (exported for use in routes.ts) --------------------------------

type RpcRow = {
  id: string;
  reported_by: string;
  reporter_display_name: string | null;
  description: string;
  difficulty: number;
  photo_url: string;
  status: string;
  lat: number;
  lng: number;
  created_at: string;
  cleaned_by: string | null;
  cleaner_display_name: string | null;
  cleaned_at: string | null;
  cleanup_photo_url: string | null;
};

function mapRpcRowToHotspot(row: RpcRow): Hotspot {
  return {
    id: row.id,
    reportedBy: row.reported_by,
    reporterDisplayName: row.reporter_display_name,
    description: row.description,
    difficulty: row.difficulty,
    photoUrl: row.photo_url,
    status: row.status as Hotspot['status'],
    lat: row.lat,
    lng: row.lng,
    createdAt: row.created_at,
    cleanedBy: row.cleaned_by,
    cleanerDisplayName: row.cleaner_display_name,
    cleanedAt: row.cleaned_at,
    cleanupPhotoUrl: row.cleanup_photo_url,
  };
}

export type ViewRow = {
  id: string | null;
  reported_by: string | null;
  reporter_display_name: string | null;
  description: string | null;
  difficulty: number | null;
  photo_url: string | null;
  status: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string | null;
  cleaned_by: string | null;
  cleaner_display_name: string | null;
  cleaned_at: string | null;
  cleanup_photo_url: string | null;
};

export function mapViewRowToHotspot(row: ViewRow): Hotspot {
  if (!row.id || !row.reported_by || row.description == null || row.difficulty == null
      || !row.photo_url || !row.status || row.lat == null || row.lng == null
      || !row.created_at) {
    throw new Error('Hotspot view returned incomplete row.');
  }
  return {
    id: row.id,
    reportedBy: row.reported_by,
    reporterDisplayName: row.reporter_display_name,
    description: row.description,
    difficulty: row.difficulty,
    photoUrl: row.photo_url,
    status: row.status as Hotspot['status'],
    lat: row.lat,
    lng: row.lng,
    createdAt: row.created_at,
    cleanedBy: row.cleaned_by,
    cleanerDisplayName: row.cleaner_display_name,
    cleanedAt: row.cleaned_at,
    cleanupPhotoUrl: row.cleanup_photo_url,
  };
}
