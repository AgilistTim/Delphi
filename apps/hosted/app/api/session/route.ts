import { NextResponse } from 'next/server';
import { startRun } from '../../lib/engine-proxy';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const question: string | undefined =
    (body.question || [body.context, body.constraints].filter(Boolean).join(' — ')) || undefined;

  if (!question) {
    return NextResponse.json({ error: 'question required' }, { status: 400 });
  }

  try {
    const run = await startRun({
      question,
      context: body.context,
      experts: typeof body.experts === 'number' ? body.experts : 5,
      rounds: typeof body.rounds === 'number' ? body.rounds : 3
    });
    return NextResponse.json({ ok: true, id: run.run_id, status: run.status });
  } catch (err) {
    console.error('[session:start] engine error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
