'use client';

import { useUser } from '@clerk/nextjs';
import { PHOTO_TARGETS } from '@plogg/core';
import { cleanupHotspot, getHotspot, uploadHotspotPhoto } from '@plogg/supabase';
import type { Hotspot } from '@plogg/types';
import imageCompression from 'browser-image-compression';
import { Camera, Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { CleanupCelebration } from '@/components/cleanup-celebration';
import { PageTransition } from '@/components/motion';
import { useSupabaseBrowser } from '@/lib/supabase/browser';

export default function CleanupPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useSupabaseBrowser();
  const { user } = useUser();

  const [hotspot, setHotspot] = useState<Hotspot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [celebration, setCelebration] = useState<{
    open: boolean;
    pointsEarned: number;
    totalPoints: number | null;
    unverified: boolean;
  }>({ open: false, pointsEarned: 0, totalPoints: null, unverified: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await getHotspot(supabase, params.id);
        if (cancelled) return;
        if (!h) setLoadError('Trash spot not found.');
        else setHotspot(h);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, supabase]);

  const onPhotoPicked = useCallback(
    async (evt: React.ChangeEvent<HTMLInputElement>) => {
      const file = evt.target.files?.[0];
      if (!file) return;
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

  async function onSubmit() {
    setSubmitError(null);
    if (!photoFile) {
      setSubmitError('Please add a proof photo.');
      return;
    }
    setSubmitting(true);
    try {
      if (!user) throw new Error('Not signed in.');
      const photoUrl = await uploadHotspotPhoto(supabase, photoFile, {
        userId: user.id,
        extension: 'jpg',
        contentType: 'image/jpeg',
      });
      await cleanupHotspot(supabase, {
        hotspotId: params.id,
        cleanupPhotoUrl: photoUrl,
        cleanerDisplayName:
          user.fullName ??
          user.primaryEmailAddress?.emailAddress?.split('@')[0] ??
          null,
      });

      let awardedPoints = 0;
      let unverified = false;
      setScoring(true);
      try {
        const scoreRes = await fetch('/api/cleanup/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hotspotId: params.id }),
        });
        if (!scoreRes.ok) throw new Error(`score_http_${scoreRes.status}`);
        const scoreJson = (await scoreRes.json()) as {
          points: number;
          valid: boolean;
        };
        awardedPoints = scoreJson.points;
        unverified = !scoreJson.valid;
      } catch (err) {
        console.warn('[ai-scoring] failed', err);
        unverified = true;
      } finally {
        setScoring(false);
      }

      const { data: statsRow } = await supabase
        .from('user_stats')
        .select('total_points')
        .eq('id', user.id)
        .maybeSingle();

      setCelebration({
        open: true,
        pointsEarned: awardedPoints,
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
        <h1 className="text-2xl font-semibold tracking-tight">Mark as cleaned</h1>
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

      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}

      {hotspot ? (
        <section className="space-y-2 rounded-lg border border-black/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/50">Original report</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hotspot.photoUrl} alt="" className="aspect-video w-full rounded object-cover" />
          <p className="text-sm">{hotspot.description}</p>
          {hotspot.status === 'cleaned' ? (
            <p className="text-sm text-blue-700">This pin has already been cleaned.</p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-2">
        <label className="text-sm font-medium">Proof photo</label>
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
            <img src={photoPreview} alt="Cleanup preview" className="h-full w-full object-cover" />
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

      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

      <Button
        type="button"
        className="w-full"
        disabled={submitting || hotspot?.status === 'cleaned'}
        onClick={onSubmit}
      >
        <span className="inline-flex items-center justify-center gap-2">
          {submitting ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : null}
          {scoring
            ? 'Analyzing your cleanup…'
            : submitting
              ? 'Uploading…'
              : 'Mark cleaned'}
        </span>
      </Button>

      <CleanupCelebration
        open={celebration.open}
        pointsEarned={celebration.pointsEarned}
        totalPoints={celebration.totalPoints}
        unverified={celebration.unverified}
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
