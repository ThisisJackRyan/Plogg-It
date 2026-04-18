import type { EventKey } from '@plogg/types';
import type { SupabaseClient } from '../client';

type AnyClient = { from: (t: string) => any };

export async function addKudos(
  client: SupabaseClient,
  userId: string,
  { hotspotId, eventType }: EventKey,
): Promise<void> {
  const c = client as unknown as AnyClient;
  const { error } = await c
    .from('kudos')
    .upsert(
      { hotspot_id: hotspotId, event_type: eventType, user_id: userId },
      { onConflict: 'hotspot_id,event_type,user_id', ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function removeKudos(
  client: SupabaseClient,
  userId: string,
  { hotspotId, eventType }: EventKey,
): Promise<void> {
  const c = client as unknown as AnyClient;
  const { error } = await c
    .from('kudos')
    .delete()
    .eq('hotspot_id', hotspotId)
    .eq('event_type', eventType)
    .eq('user_id', userId);
  if (error) throw error;
}
