import { auth } from '@clerk/nextjs/server';
import { generateObject } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_CLEANUP_POINTS = 200;
const MAX_REPORT_POINTS = 50;
const REPORT_SHARE = 0.25;
const MIN_CONFIDENCE = 0.5;
const MODEL = 'anthropic/claude-sonnet-4-6';

const ScoreSchema = z.object({
  items: z.array(
    z.object({
      label: z.string(),
      count: z.number().describe('Integer >= 1.'),
      size: z.enum(['tiny', 'small', 'medium', 'large', 'bulky']),
    }),
  ),
  difficulty: z.number().describe('Integer 1-5.'),
  estimated_cleanup_points: z
    .number()
    .describe(
      `Points a cleaner would earn for removing this trash. Integer 0-${MAX_CLEANUP_POINTS}.`,
    ),
  valid_report: z
    .boolean()
    .describe('True only if the photo clearly shows litter/trash that needs cleanup.'),
  confidence: z.number().describe('0 to 1.'),
  rationale: z.string(),
});

const RequestSchema = z.object({
  hotspotId: z.string().uuid(),
});

const PROMPT = `You are scoring a trash-hotspot REPORT submission for a community cleanup app.

You receive a single photo that should contain visible litter/trash needing cleanup.

Your job:
- Identify the trash items (type, count, size).
- Estimate the total points a future cleaner would earn for removing it (0-${MAX_CLEANUP_POINTS}).
- Set valid_report=false if the photo has no visible trash (empty ground, selfie, unrelated scene). In that case, estimated_cleanup_points MUST be 0.

Point rubric anchors (cleaner reward, not reporter):
- A few cigarette butts or small wrappers → 5-10
- A single bottle, can, or small piece of litter → 10-20
- A small bag worth of mixed litter → 30-50
- A bulky item (tire, mattress, appliance, large debris) → 75-150
- Multiple bulky items or a large dumped pile → 150-${MAX_CLEANUP_POINTS}

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
    .select('id, photo_url, reported_by')
    .eq('id', hotspotId)
    .maybeSingle();

  if (hotspotErr || !hotspot) {
    return NextResponse.json({ error: 'hotspot_not_found' }, { status: 404 });
  }
  if (!hotspot.photo_url) {
    return NextResponse.json({ error: 'missing_photo' }, { status: 400 });
  }
  if (hotspot.reported_by !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let photoBytes: Uint8Array;
  try {
    const res = await fetch(hotspot.photo_url);
    if (!res.ok) throw new Error(`photo_fetch_${res.status}`);
    photoBytes = new Uint8Array(await res.arrayBuffer());
  } catch (err) {
    console.error('[report/score] photo fetch error', err);
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
            { type: 'image', image: photoBytes },
          ],
        },
      ],
    });
    score = result.object;
  } catch (err) {
    console.error('[report/score] model error', err);
    return NextResponse.json({ error: 'scoring_failed' }, { status: 502 });
  }

  const accepted = score.valid_report && score.confidence >= MIN_CONFIDENCE;

  if (!accepted) {
    await supabase.from('hotspots').delete().eq('id', hotspotId);
    return NextResponse.json(
      {
        error: 'not_trash',
        valid: false,
        confidence: score.confidence,
        rationale: score.rationale,
      },
      { status: 422 },
    );
  }

  const reportPoints = Math.max(
    0,
    Math.min(
      MAX_REPORT_POINTS,
      Math.round(score.estimated_cleanup_points * REPORT_SHARE),
    ),
  );

  const { error: updateErr } = await supabase
    .from('hotspots')
    .update({
      report_score: score,
      report_points: reportPoints,
    })
    .eq('id', hotspotId);

  if (updateErr) {
    console.error('[report/score] update error', updateErr);
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 });
  }

  const { error: awardErr } = await supabase.rpc('award_report_points', {
    p_hotspot_id: hotspotId,
    p_points: reportPoints,
    p_metadata: {
      rationale: score.rationale,
      confidence: score.confidence,
      valid_report: score.valid_report,
      items: score.items,
      difficulty: score.difficulty,
      estimated_cleanup_points: score.estimated_cleanup_points,
    },
  });

  if (awardErr && awardErr.message !== 'already_awarded') {
    console.error('[report/score] award error', awardErr);
  }

  return NextResponse.json({
    points: reportPoints,
    valid: score.valid_report,
    items: score.items,
    confidence: score.confidence,
  });
}
