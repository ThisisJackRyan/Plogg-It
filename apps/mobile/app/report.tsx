import { zodResolver } from '@hookform/resolvers/zod';
import { PHOTO_TARGETS } from '@plogg/core';
import { insertHotspot, uploadHotspotPhoto, type SupabaseClient } from '@plogg/supabase';
import { HotspotInsert } from '@plogg/types';
import Mapbox, { Camera, MapView, PointAnnotation } from '@rnmapbox/maps';
import { Link, router } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, FieldError } from '../components/ui';
import { supabase } from '../lib/supabase';

type FormValues = Pick<HotspotInsert, 'description' | 'difficulty' | 'lat' | 'lng'>;

export default function ReportScreen() {
  const client = useMemo(() => supabase as unknown as SupabaseClient, []);
  const cameraRef = useRef<Camera | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(
      HotspotInsert.omit({ photoUrl: true }) as unknown as typeof HotspotInsert,
    ) as unknown as ReturnType<typeof zodResolver>,
    defaultValues: { description: '', difficulty: 2, lat: 37.7749, lng: -122.4194 },
  });

  const lat = watch('lat');
  const lng = watch('lng');

  // Ask for location, center the camera.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (cancelled) return;
      setValue('lat', pos.coords.latitude);
      setValue('lng', pos.coords.longitude);
      cameraRef.current?.setCamera({
        centerCoordinate: [pos.coords.longitude, pos.coords.latitude],
        zoomLevel: 15,
        animationDuration: 300,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [setValue]);

  const pickPhoto = useCallback(async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', `Grant ${source} access to attach a photo.`);
      return;
    }

    const picker = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await picker({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
      exif: false,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    // Downscale + JPEG-compress.
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: PHOTO_TARGETS.maxDimensionPx } }],
      { compress: PHOTO_TARGETS.jpegQuality, format: ImageManipulator.SaveFormat.JPEG },
    );
    setPhotoUri(manipulated.uri);
  }, []);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    if (!photoUri) {
      setSubmitError('Please add a photo of the trash.');
      return;
    }
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) throw new Error('Not signed in.');

      // RN-safe upload: fetch the local uri into a Blob, then upload.
      const res = await fetch(photoUri);
      const blob = await res.blob();

      const photoUrl = await uploadHotspotPhoto(client, blob, {
        userId: user.id,
        extension: 'jpg',
        contentType: 'image/jpeg',
      });

      await insertHotspot(client, {
        ...values,
        photoUrl,
      });

      router.replace('/');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Report trash</Text>
            <Link href="/" style={styles.cancel}>
              Cancel
            </Link>
          </View>

          <Text style={styles.label}>Location</Text>
          <Text style={styles.hint}>Drag the map to adjust the pin.</Text>
          <View style={styles.mapBox}>
            <MapView
              style={styles.map}
              styleURL={Mapbox.StyleURL.Street}
              onRegionDidChange={(feature) => {
                const center = feature.geometry as { coordinates?: number[] } | null;
                const coords = center?.coordinates;
                if (!coords || coords.length < 2) return;
                const [cLng, cLat] = coords as [number, number];
                setValue('lng', cLng, { shouldDirty: true });
                setValue('lat', cLat, { shouldDirty: true });
              }}
            >
              <Camera ref={cameraRef} centerCoordinate={[lng, lat]} zoomLevel={15} />
              <PointAnnotation id="dropPin" coordinate={[lng, lat]}>
                <View style={styles.pin} />
              </PointAnnotation>
            </MapView>
          </View>
          <Text style={styles.coords}>
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </Text>

          <Text style={styles.label}>Photo</Text>
          {photoUri ? (
            <Pressable onPress={() => pickPhoto('library')} style={styles.photoBox}>
              <Image source={{ uri: photoUri }} style={styles.photo} />
              <View style={styles.photoReplace}>
                <Text style={{ color: 'white', fontSize: 12 }}>Replace</Text>
              </View>
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={styles.photoPicker} onPress={() => pickPhoto('camera')}>
                <Text style={styles.photoPickerIcon}>📷</Text>
                <Text style={styles.photoPickerText}>Take photo</Text>
              </Pressable>
              <Pressable style={styles.photoPicker} onPress={() => pickPhoto('library')}>
                <Text style={styles.photoPickerIcon}>🖼️</Text>
                <Text style={styles.photoPickerText}>Choose photo</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.label}>Description</Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                placeholder="e.g. Pile of bottles by the bus stop"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                maxLength={500}
                multiline
                style={[styles.input, errors.description ? styles.inputError : null]}
              />
            )}
          />
          <FieldError>{errors.description?.message}</FieldError>

          <Text style={styles.label}>Difficulty</Text>
          <Controller
            control={control}
            name="difficulty"
            render={({ field: { value, onChange } }) => (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => onChange(n)}
                    style={[styles.chip, value === n ? styles.chipSelected : null]}
                  >
                    <Text style={[styles.chipText, value === n ? styles.chipTextSelected : null]}>
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          />
          <Text style={styles.hint}>1 = tiny · 5 = major (mattress, tire, cart)</Text>

          {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

          <Button
            label={submitting ? 'Reporting…' : 'Report trash'}
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
          />
          {submitting ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '600' },
  cancel: { color: '#256e45', fontSize: 14 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12 },
  hint: { fontSize: 12, color: '#00000099' },
  coords: { fontSize: 12, color: '#00000099', marginTop: 4 },
  mapBox: { height: 220, borderRadius: 12, overflow: 'hidden', backgroundColor: '#eee', marginTop: 4 },
  map: { flex: 1 },
  pin: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#2e8b57', borderWidth: 3, borderColor: 'white' },
  photoBox: { position: 'relative', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden', backgroundColor: '#eee' },
  photo: { width: '100%', height: '100%' },
  photoReplace: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  photoPicker: {
    flex: 1,
    aspectRatio: 1.4,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#00000022',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoPickerIcon: { fontSize: 28 },
  photoPickerText: { fontSize: 13, color: '#00000099' },
  input: {
    borderWidth: 1,
    borderColor: '#00000014',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  inputError: { borderColor: '#dc2626' },
  chip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00000014',
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: 'rgba(46,139,87,0.1)', borderColor: '#2e8b57' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#000000' },
  chipTextSelected: { color: '#256e45' },
  errorText: { color: '#dc2626', fontSize: 13, marginTop: 8 },
});
