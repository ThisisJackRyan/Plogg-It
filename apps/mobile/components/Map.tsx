import Mapbox, { Camera, MapView, MarkerView, PointAnnotation, UserLocation } from '@rnmapbox/maps';
import type { BoundingBox, Hotspot } from '@plogg/types';
import { useHotspotsInBbox } from '@plogg/supabase';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useSupabase } from '../lib/supabase';

const DEFAULT_CENTER: [number, number] = [-122.4194, 37.7749];

export function PloggMap() {
  const client = useSupabase();
  const cameraRef = useRef<Camera | null>(null);
  const [bbox, setBbox] = useState<BoundingBox | null>(null);
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const [locating, setLocating] = useState(false);

  const { data: hotspots, isFetching } = useHotspotsInBbox(client, bbox);

  // On mount, center on user's current location if we have permission.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      setLocating(true);
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        cameraRef.current?.setCamera({
          centerCoordinate: [pos.coords.longitude, pos.coords.latitude],
          zoomLevel: 13,
          animationDuration: 400,
        });
      } finally {
        if (!cancelled) setLocating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRegionDidChange = useCallback(async (feature: GeoJSON.Feature) => {
    const bounds = (feature as unknown as { properties: { visibleBounds?: number[][] } }).properties
      .visibleBounds;
    if (!bounds || bounds.length !== 2) return;
    const [[maxLng, maxLat], [minLng, minLat]] = bounds as [[number, number], [number, number]];
    setBbox({ minLng, minLat, maxLng, maxLat });
  }, []);

  return (
    <View style={styles.root}>
      <MapView
        style={styles.map}
        styleURL={Mapbox.StyleURL.Street}
        onRegionDidChange={handleRegionDidChange}
        onPress={() => setSelected(null)}
      >
        <Camera ref={cameraRef} centerCoordinate={DEFAULT_CENTER} zoomLevel={12} />
        <UserLocation visible />

        {hotspots?.map((h) => (
          <PointAnnotation
            key={h.id}
            id={h.id}
            coordinate={[h.lng, h.lat]}
            onSelected={() => setSelected(h)}
          >
            <PinSvg difficulty={h.difficulty} />
          </PointAnnotation>
        ))}

        {selected ? (
          <MarkerView coordinate={[selected.lng, selected.lat]} anchor={{ x: 0.5, y: 1.4 }}>
            <HotspotCard hotspot={selected} onClose={() => setSelected(null)} />
          </MarkerView>
        ) : null}
      </MapView>

      {(isFetching || locating) ? (
        <View style={styles.loadingPill} pointerEvents="none">
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>
            {locating ? 'Finding you…' : 'Loading hotspots…'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function PinSvg({ difficulty }: { difficulty: number }) {
  const colors = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];
  const color = colors[Math.min(Math.max(difficulty, 1), 5) - 1] ?? '#22c55e';
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: color,
        borderWidth: 3,
        borderColor: 'white',
      }}
    />
  );
}

function HotspotCard({ hotspot, onClose }: { hotspot: Hotspot; onClose: () => void }) {
  return (
    <Pressable onPress={onClose} style={styles.card}>
      <Image source={{ uri: hotspot.photoUrl }} style={styles.cardImage} />
      <Text style={styles.cardDesc} numberOfLines={2}>
        {hotspot.description}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>Difficulty {hotspot.difficulty}/5</Text>
        <Text style={styles.cardMeta}>{hotspot.reporterDisplayName ?? 'Anonymous'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1 },
  loadingPill: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  loadingText: { fontSize: 12, color: '#00000099' },
  card: {
    width: 240,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    gap: 6,
  },
  cardImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: '#eee' },
  cardDesc: { fontSize: 14, fontWeight: '500', color: '#000' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardMeta: { fontSize: 11, color: '#00000099' },
});
