import { auth } from '@clerk/nextjs/server';
import { generateObject } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_POINTS = 200;
const MIN_POINTS = 0;
const MODEL = 'anthropic/claude-sonnet-4-6';

const ScoreSchema = z.object({
  before: z.object({
    items: z
      .array(
        z.object({
          label: z.string(),
          count: z.number().describe('Integer >= 1.'),
          size: z.enum(['tiny', 'small', 'medium', 'large', 'bulky']),
        }),
      )
      .describe('Items of trash visible in the before photo.'),
    difficulty: z.number().describe('Integer 1-5.'),
    estimated_points: z
      .number()
      .describe(`Points earned if the cleanup is verified. Integer 0-${MAX_POINTS}.`),
  }),
  after: z.object({
    appears_cleaned: z.boolean(),
    same_location_likely: z.boolean(),
    notes: z.string(),
  }),
  valid_cleanup: z
    .boolean()
    .describe(
      'True only if before clearly contains trash AND after plausibly shows it removed.',
    ),
  confidence: z.number().describe('0 to 1.'),
  final_points: z.number().describe(`Integer 0-${MAX_POINTS}.`),
  rationale: z.string(),
});

const RequestSchema = z.object({
  hotspotId: z.string().uuid(),
});

const PROMPT = `You are scoring a litter cleanup submission for a trash-reporting app.

You will receive TWO photos:
- BEFORE: the original hotspot report — this should contain the trash.
- AFTER: the cleanup proof — this should show the same area with the trash removed (i.e. empty/clean ground).

IMPORTANT:
- The AFTER photo is expected NOT to contain trash — that is the goal. Do NOT penalize a clean-looking after photo.
- Score difficulty/points based ONLY on what is visible in the BEFORE photo.
- The AFTER photo is used only to verify the cleanup happened. Be lenient on angle, lighting, zoom — they will naturally differ.
- Set valid_cleanup=true only if BEFORE clearly shows trash AND AFTER plausibly shows the same area cleaned up.
- If BEFORE has no visible trash, or AFTER still shows the same trash, valid_cleanup=false and final_points=0.
- If valid_cleanup=false, final_points MUST be 0.
- final_points is capped at ${MAX_POINTS}.

Point rubric (rough anchors, use judgment):
- A few cigarette butts or small wrappers → 5-10
- A single bottle, can, or small piece of litter → 10-20
- A small bag worth of mixed litter → 30-50
- A bulky item (tire, mattress, appliance, large debris) → 75-150
- Multiple bulky items or a large dumped pile → 150-${MAX_POINTS}

Return structured JSON matching the provided schema.`;

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const { hotspotId } = parsed.data;

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: hotspot, error: hotspotErr } = await supabase
    .from('hotspots')
    .select('id, photo_url, cleanup_photo_url, cleaned_by')
    .eq('id', hotspotId)
    .maybeSingle();

  if (hotspotErr || !hotspot) {
    return NextResponse.json({ error: 'hotspot_not_found' }, { status: 404 });
  }
  if (!hotspot.cleanup_photo_url || !hotspot.photo_url) {
    return NextResponse.json({ error: 'missing_photos' }, { status: 400 });
  }
  if (hotspot.cleaned_by && hotspot.cleaned_by !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let beforeBytes: Uint8Array;
  let afterBytes: Uint8Array;
  try {
    const [beforeRes, afterRes] = await Promise.all([
      fetch(hotspot.photo_url),
      fetch(hotspot.cleanup_photo_url),
    ]);
    if (!beforeRes.ok) throw new Error(`before_fetch_${beforeRes.status}`);
    if (!afterRes.ok) throw new Error(`after_fetch_${afterRes.status}`);
    [beforeBytes, afterBytes] = await Promise.all([
      beforeRes.arrayBuffer().then((b) => new Uint8Array(b)),
      afterRes.arrayBuffer().then((b) => new Uint8Array(b)),
    ]);
  } catch (err) {
    console.error('[cleanup/score] photo fetch error', err);
    return NextResponse.json({ error: 'photo_fetch_failed' }, { status: 502 });
  }

  let score: z.infer<typeof ScoreSchema>;
  try {
    const result = await generateObject({
      model: MODEL,
      schema: ScoreSchema,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'text', text: 'BEFORE photo:' },
            { type: 'image', image: beforeBytes },
            { type: 'text', text: 'AFTER photo:' },
            { type: 'image', image: afterBytes },
          ],
        },
      ],
    });
    score = result.object;
  } catch (err) {
    console.error('[cleanup/score] model error', err);
    return NextResponse.json({ error: 'scoring_failed' }, { status: 502 });
  }

  const clampedPoints = score.valid_cleanup
    ? Math.max(MIN_POINTS, Math.min(MAX_POINTS, Math.round(score.final_points)))
    : 0;

  const { error: updateErr } = await supabase
    .from('hotspots')
    .update({
      cleanup_score: score,
      cleanup_points: clampedPoints,
    })
    .eq('id', hotspotId);

  if (updateErr) {
    console.error('[cleanup/score] update error', updateErr);
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 });
  }

  const { error: awardErr } = await supabase.rpc('award_cleanup_points', {
    p_hotspot_id: hotspotId,
    p_points: clampedPoints,
    p_metadata: {
      rationale: score.rationale,
      confidence: score.confidence,
      valid_cleanup: score.valid_cleanup,
      items: score.before.items,
      difficulty: score.before.difficulty,
    },
  });

  if (awardErr && awardErr.message !== 'already_awarded') {
    console.error('[cleanup/score] award error', awardErr);
  }

  return NextResponse.json({
    points: clampedPoints,
    valid: score.valid_cleanup,
    items: score.before.items,
    confidence: score.confidence,
  });
}
