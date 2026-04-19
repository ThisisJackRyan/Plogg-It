'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import { zodResolver } from '@hookform/resolvers/zod';
import { useUser } from '@clerk/nextjs';
import { PHOTO_TARGETS } from '@plogg/core';
import {
  cleanupHotspot,
  insertHotspot,
  linkHotspotToRoute,
  uploadHotspotPhoto,
} from '@plogg/supabase';
import { HotspotInsert } from '@plogg/types';
import imageCompression from 'browser-image-compression';
import { Camera, Check, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import MapGL, { Marker, NavigationControl, type MarkerDragEvent } from 'react-map-gl';
import { Button, FieldError, Input } from '@/components/ui';
import { CleanupCelebration } from '@/components/cleanup-celebration';
import { PageTransition } from '@/components/motion';
import { env } from '@/lib/env';
import { useSupabaseBrowser } from '@/lib/supabase/browser';
import { useRouteSession } from '@/components/route-session-context';

type FormValues = Pick<HotspotInsert, 'description' | 'difficulty' | 'lat' | 'lng'>;

export default function ReportPage() {
  return (
    <Suspense fallback={null}>
      <ReportPageInner />
    </Suspense>
  );
}

function ReportPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeId = searchParams.get('routeId');
  const supabase = useSupabaseBrowser();
  const { user } = useUser();
  const routeSession = useRouteSession();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [alreadyCleaned, setAlreadyCleaned] = useState(false);
  const [cleanupPhotoFile, setCleanupPhotoFile] = useState<File | null>(null);
  const [cleanupPhotoPreview, setCleanupPhotoPreview] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scoring, setScoring] = useState<null | 'report' | 'cleanup'>(null);
  const [celebration, setCelebration] = useState<{
    open: boolean;
    pointsEarned: number;
    totalPoints: number | null;
    unverified: boolean;
  }>({ open: false, pointsEarned: 0, totalPoints: null, unverified: false });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cleanupFileInputRef = useRef<HTMLInputElement>(null);

  const compressPhoto = useCallback(async (file: File) => {
    const compressed = await imageCompression(file, {
      maxSizeMB: PHOTO_TARGETS.maxSizeKb / 1024,
      maxWidthOrHeight: PHOTO_TARGETS.maxDimensionPx,
      initialQuality: PHOTO_TARGETS.jpegQuality,
      useWebWorker: true,
      fileType: 'image/jpeg',
    });
    return compressed instanceof File
      ? compressed
      : new File([compressed], 'photo.jpg', { type: 'image/jpeg' });
  }, []);

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
      const compressedFile = await compressPhoto(file);
      setPhotoFile(compressedFile);
      setPhotoPreview(URL.createObjectURL(compressedFile));
    },
    [compressPhoto],
  );

  const onCleanupPhotoPicked = useCallback(
    async (evt: React.ChangeEvent<HTMLInputElement>) => {
      const file = evt.target.files?.[0];
      if (!file) return;
      const compressedFile = await compressPhoto(file);
      setCleanupPhotoFile(compressedFile);
      setCleanupPhotoPreview(URL.createObjectURL(compressedFile));
    },
    [compressPhoto],
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
    if (alreadyCleaned && !cleanupPhotoFile) {
      setSubmitError('Please add a cleanup proof photo.');
      return;
    }
    setSubmitting(true);
    try {
      if (!user) throw new Error('Not signed in.');

      const displayName =
        user.fullName ??
        user.primaryEmailAddress?.emailAddress?.split('@')[0] ??
        null;

      const photoUrl = await uploadHotspotPhoto(supabase, photoFile, {
        userId: user.id,
        extension: 'jpg',
        contentType: 'image/jpeg',
      });

      const newHotspot = await insertHotspot(
        supabase,
        { ...values, photoUrl },
        { userId: user.id, displayName },
      );

      type ScoreResponse = { points: number; valid: boolean };

      setScoring('report');
      let reportRes: Response;
      try {
        reportRes = await fetch('/api/report/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hotspotId: newHotspot.id }),
        });
      } finally {
        setScoring(null);
      }
      if (reportRes.status === 422) {
        const errJson = (await reportRes.json().catch(() => null)) as
          | { rationale?: string; confidence?: number }
          | null;
        const baseMsg =
          "We couldn't confirm this photo shows trash. Please take a clearer photo of the litter and try again.";
        const isLocal =
          typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1');
        setSubmitError(
          isLocal && errJson?.rationale
            ? `${baseMsg}\n\n[dev] ${errJson.rationale}${
                errJson.confidence !== undefined
                  ? ` (confidence ${errJson.confidence.toFixed(2)})`
                  : ''
              }`
            : baseMsg,
        );
        return;
      }
      if (!reportRes.ok) {
        await supabase.from('hotspots').delete().eq('id', newHotspot.id);
        setSubmitError(
          "We couldn't verify your photo right now. Please try again later.",
        );
        return;
      }
      const reportJson = (await reportRes.json()) as ScoreResponse;
      const reportPoints = reportJson.points;

      if (alreadyCleaned && cleanupPhotoFile) {
        const cleanupPhotoUrl = await uploadHotspotPhoto(supabase, cleanupPhotoFile, {
          userId: user.id,
          extension: 'jpg',
          contentType: 'image/jpeg',
        });
        await cleanupHotspot(supabase, {
          hotspotId: newHotspot.id,
          cleanupPhotoUrl,
          cleanerDisplayName: displayName,
        });
      }

      if (routeId) {
        await linkHotspotToRoute(supabase, routeId, newHotspot.id);
        routeSession.incrementItemCount();
      }

      let cleanupPoints = 0;
      let cleanupValid = false;
      if (alreadyCleaned) {
        setScoring('cleanup');
        try {
          const res = await fetch('/api/cleanup/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hotspotId: newHotspot.id }),
          });
          if (!res.ok) throw new Error(`cleanup_score_http_${res.status}`);
          const json = (await res.json()) as ScoreResponse;
          cleanupPoints = json.points;
          cleanupValid = json.valid;
        } catch (err) {
          console.warn('[ai-scoring] cleanup failed', err);
        } finally {
          setScoring(null);
        }
      }

      const totalAwarded = reportPoints + cleanupPoints;
      const unverified = alreadyCleaned && !cleanupValid && reportPoints === 0;

      const { data: statsRow } = await supabase
        .from('user_stats')
        .select('total_points')
        .eq('id', user.id)
        .maybeSingle();

      setCelebration({
        open: true,
        pointsEarned: totalAwarded,
        totalPoints: statsRow?.total_points ?? null,
        unverified,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
    <PageTransition className="mx-auto flex min-h-[100dvh] max-w-xl flex-col gap-6 px-4 py-6 sm:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Report trash</h1>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) router.back();
            else router.push('/');
          }}
          className="text-sm text-brand-700 hover:underline"
        >
          Cancel
        </button>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <section className="space-y-2">
          <label className="text-sm font-medium">Location</label>
          <p className="text-xs opacity-60">
            Drag the pin to adjust. Default is your current location.
          </p>
          <div className="h-56 overflow-hidden rounded-lg border border-black/10 sm:h-72">
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
              <Camera aria-hidden className="h-7 w-7 text-black/60" />
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
              <div className="flex gap-1.5 sm:gap-2">
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onChange(n)}
                    className={`flex-1 rounded-lg border px-2 py-2.5 text-sm font-medium transition sm:px-3 ${
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

        <section className="space-y-3 rounded-lg border border-black/10 p-3">
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={alreadyCleaned}
              onChange={(e) => setAlreadyCleaned(e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-black/25 bg-white text-white transition peer-checked:border-brand-600 peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40"
            >
              {alreadyCleaned ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
            </span>
            <span>
              <span className="font-medium">I already cleaned it up</span>
              <span className="block text-xs opacity-60">
                Mark this pin as cleaned right now with a proof photo.
              </span>
            </span>
          </label>

          {alreadyCleaned ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Cleanup proof photo</label>
              <input
                ref={cleanupFileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onCleanupPhotoPicked}
                className="hidden"
              />
              {cleanupPhotoPreview ? (
                <button
                  type="button"
                  onClick={() => cleanupFileInputRef.current?.click()}
                  className="relative block aspect-video w-full overflow-hidden rounded-lg border border-black/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cleanupPhotoPreview}
                    alt="Cleanup preview"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
                    Replace
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => cleanupFileInputRef.current?.click()}
                  className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-black/20 text-sm opacity-70 hover:bg-black/2"
                >
                  <Camera aria-hidden className="h-7 w-7 text-black/60" />
                  <span>Tap to take or choose a photo</span>
                </button>
              )}
            </div>
          ) : null}
        </section>

        {submitError ? (
          <p className="whitespace-pre-line text-sm text-red-600">{submitError}</p>
        ) : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          <span className="inline-flex items-center justify-center gap-2">
            {submitting ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : null}
            {scoring === 'report'
              ? 'Checking your photo…'
              : scoring === 'cleanup'
                ? 'Analyzing your cleanup…'
                : submitting
                  ? alreadyCleaned
                    ? 'Submitting…'
                    : 'Reporting…'
                  : alreadyCleaned
                    ? 'Report & mark cleaned'
                    : 'Report trash'}
          </span>
        </Button>
      </form>

      <CleanupCelebration
        open={celebration.open}
        pointsEarned={celebration.pointsEarned}
        totalPoints={celebration.totalPoints}
        unverified={celebration.unverified}
        title={alreadyCleaned ? 'Reported & Cleaned!' : 'Hotspot Reported!'}
        subtitle={
          alreadyCleaned
            ? 'Double win — reported and cleaned in one go.'
            : "It's only a matter of time till this is cleaned up."
        }
        onContinue={() => {
          router.replace('/');
          router.refresh();
        }}
        onSeeLeaderboard={() => {
          router.replace('/leaderboard');
        }}
      />
    </PageTransition>
    </main>
  );
}
