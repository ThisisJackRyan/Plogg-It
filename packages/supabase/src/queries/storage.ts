import { photoStoragePath } from '@plogg/core';
import type { SupabaseClient } from '../client';

const BUCKET = 'hotspot-photos';

/**
 * Upload a hotspot photo to the `hotspot-photos` bucket under the caller's
 * own folder (`hotspots/{userId}/...`). Returns the public URL.
 */
export async function uploadHotspotPhoto(
  client: SupabaseClient,
  file: Blob | File,
  options: { userId: string; extension?: string; contentType?: string },
): Promise<string> {
  const ext = (options.extension ?? (file instanceof File ? file.name.split('.').pop() : 'jpg'))
    ?.toLowerCase()
    ?.replace(/[^a-z0-9]/g, '') || 'jpg';

  const path = photoStoragePath(options.userId, ext);
  const contentType = options.contentType ?? file.type ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  const { error } = await client.storage.from(BUCKET).upload(path, file, {
    contentType,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
