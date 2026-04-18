import type { BoundingBox, Hotspot, HotspotInsert } from '@plogg/types';
import type { SupabaseClient } from '../client';

/**
 * List active hotspots within a viewport bounding box.
 * Uses the `hotspots_in_bbox` RPC so the spatial GIST index is hit.
 */
export async function listHotspotsInBbox(
  client: SupabaseClient,
  bbox: BoundingBox,
): Promise<Hotspot[]> {
  const { data, error } = await client.rpc('hotspots_in_bbox', {
    min_lng: bbox.minLng,
    min_lat: bbox.minLat,
    max_lng: bbox.maxLng,
    max_lat: bbox.maxLat,
  });
  if (error) throw error;
  return (data ?? []).map(mapRpcRowToHotspot);
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
  return mapViewRowToHotspot(data);
}

/**
 * Insert a new hotspot. Caller must be signed in.
 * PostGIS location is built from lng/lat via the SRID-tagged WKT literal.
 * Returns the inserted row directly — we don't round-trip through the view
 * because the reporter display name can be joined later by the map query.
 */
export async function insertHotspot(
  client: SupabaseClient,
  input: HotspotInsert,
): Promise<Hotspot> {
  const { data: userData, error: userErr } = await client.auth.getUser();
  if (userErr) throw userErr;
  const user = userData.user;
  if (!user) throw new Error('Must be signed in to insert a hotspot.');
  const userId = user.id;

  // Defense in depth: ensure a profile row exists before inserting a hotspot,
  // since hotspots.reported_by has a FK to profiles.id. The trigger on
  // auth.users normally handles this, but we upsert here to survive any case
  // where it didn't fire.
  const { error: profileError } = await client
    .from('profiles')
    .upsert(
      {
        id: userId,
        display_name: user.email ? user.email.split('@')[0] : null,
      },
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
    reporterDisplayName: null,
    description: data.description ?? input.description,
    difficulty: data.difficulty ?? input.difficulty,
    photoUrl: data.photo_url ?? input.photoUrl,
    status: (data.status ?? 'active') as Hotspot['status'],
    lat: input.lat,
    lng: input.lng,
    createdAt: data.created_at,
  };
}

// ---- mappers ---------------------------------------------------------------

type RpcRow = {
  id: string;
  reported_by: string;
  reporter_display_name: string;
  description: string;
  difficulty: number;
  photo_url: string;
  status: string;
  lat: number;
  lng: number;
  created_at: string;
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
  };
}

function mapViewRowToHotspot(row: {
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
}): Hotspot {
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
  };
}
