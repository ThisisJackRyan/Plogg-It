'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import { zodResolver } from '@hookform/resolvers/zod';
import { PHOTO_TARGETS } from '@plogg/core';
import { insertHotspot, uploadHotspotPhoto, type SupabaseClient } from '@plogg/supabase';
import { HotspotInsert } from '@plogg/types';
import imageCompression from 'browser-image-compression';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import MapGL, { Marker, NavigationControl, type MarkerDragEvent } from 'react-map-gl';
import { Button, FieldError, Input } from '@/components/ui';
import { env } from '@/lib/env';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

type FormValues = Pick<HotspotInsert, 'description' | 'difficulty' | 'lat' | 'lng'>;

export default function ReportPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser() as unknown as SupabaseClient, []);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // On mount, try to grab the user's current location.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('lat', pos.coords.latitude, { shouldDirty: true });
        setValue('lng', pos.coords.longitude, { shouldDirty: true });
      },
      () => {
        /* user denied or timed out — keep defaults */
      },
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }, [setValue]);

  const onPhotoPicked = useCallback(
    async (evt: React.ChangeEvent<HTMLInputElement>) => {
      const file = evt.target.files?.[0];
      if (!file) return;

      // Compress client-side before preview to match what we'll upload.
      const compressed = await imageCompression(file, {
        maxSizeMB: PHOTO_TARGETS.maxSizeKb / 1024,
        maxWidthOrHeight: PHOTO_TARGETS.maxDimensionPx,
        initialQuality: PHOTO_TARGETS.jpegQuality,
        useWebWorker: true,
        fileType: 'image/jpeg',
      });
      const compressedFile =
        compressed instanceof File
          ? compressed
          : new File([compressed], 'photo.jpg', { type: 'image/jpeg' });

      setPhotoFile(compressedFile);
      setPhotoPreview(URL.createObjectURL(compressedFile));
    },
    [],
  );

  const onDragEnd = useCallback(
    (evt: MarkerDragEvent) => {
      setValue('lat', evt.lngLat.lat, { shouldDirty: true });
      setValue('lng', evt.lngLat.lng, { shouldDirty: true });
    },
    [setValue],
  );

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    if (!photoFile) {
      setSubmitError('Please add a photo of the trash.');
      return;
    }
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in.');

      const photoUrl = await uploadHotspotPhoto(supabase, photoFile, {
        userId: user.id,
        extension: 'jpg',
        contentType: 'image/jpeg',
      });

      await insertHotspot(supabase, {
        ...values,
        photoUrl,
      });

      router.replace('/');
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Report trash</h1>
        <Link href="/" className="text-sm text-brand-700 hover:underline">
          Cancel
        </Link>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <section className="space-y-2">
          <label className="text-sm font-medium">Location</label>
          <p className="text-xs opacity-60">
            Drag the pin to adjust. Default is your current location.
          </p>
          <div className="h-64 overflow-hidden rounded-lg border border-black/10">
            <MapGL
              reuseMaps
              longitude={lng}
              latitude={lat}
              zoom={15}
              mapStyle="mapbox://styles/mapbox/streets-v12"
              mapboxAccessToken={env.MAPBOX_TOKEN}
              style={{ width: '100%', height: '100%' }}
              onMove={(e) => {
                setValue('lng', e.viewState.longitude, { shouldDirty: true });
                setValue('lat', e.viewState.latitude, { shouldDirty: true });
              }}
            >
              <NavigationControl position="top-right" />
              <Marker longitude={lng} latitude={lat} draggable onDragEnd={onDragEnd} anchor="bottom">
                <svg width="28" height="36" viewBox="0 0 28 36" aria-hidden>
                  <path
                    d="M14 35S27 22.8 27 13.5A13 13 0 1 0 1 13.5C1 22.8 14 35 14 35Z"
                    fill="#2e8b57"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <circle cx="14" cy="13" r="4.5" fill="white" />
                </svg>
              </Marker>
            </MapGL>
          </div>
          <p className="text-xs opacity-60">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </p>
        </section>

        <section className="space-y-2">
          <label className="text-sm font-medium">Photo</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPhotoPicked}
            className="hidden"
          />
          {photoPreview ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative block aspect-video w-full overflow-hidden rounded-lg border border-black/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="Trash preview" className="h-full w-full object-cover" />
              <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
                Replace
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-black/20 text-sm opacity-70 hover:bg-black/2"
            >
              <span className="text-2xl">📷</span>
              <span>Tap to take or choose a photo</span>
            </button>
          )}
        </section>

        <section className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <Input
            id="description"
            placeholder="e.g. Pile of bottles by the bus stop"
            maxLength={500}
            {...register('description')}
            error={errors.description?.message}
          />
          <FieldError>{errors.description?.message}</FieldError>
        </section>

        <section className="space-y-2">
          <label className="text-sm font-medium">Difficulty</label>
          <Controller
            control={control}
            name="difficulty"
            render={({ field: { value, onChange } }) => (
              <div className="flex gap-2">
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onChange(n)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      value === n
                        ? 'border-brand-600 bg-brand-500/10 text-brand-700'
                        : 'border-black/10 bg-white hover:border-black/20'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          />
          <p className="text-xs opacity-60">
            1 = tiny (single wrapper) · 5 = major (dumped mattress, shopping cart)
          </p>
        </section>

        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Reporting…' : 'Report trash'}
        </Button>
      </form>
    </main>
  );
}
