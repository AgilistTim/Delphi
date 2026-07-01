import { NextResponse } from 'next/server';
import { startRun } from '../../lib/engine-proxy';
import { getUser } from '../../lib/supabase/server';
import { getUserKey } from '../../lib/keys';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const question: string | undefined =
    (body.question || [body.context, body.constraints].filter(Boolean).join(' — ')) || undefined;

  if (!question) {
    return NextResponse.json({ error: 'question required' }, { status: 400 });
  }

  const user = await getUser();

  const apiKey = await getUserKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'no_key', message: 'Add your Anthropic API key in Settings before running a deliberation.' },
      { status: 402 }
    );
  }

  try {
    const run = await startRun({
      question,
      context: body.context,
      experts: typeof body.experts === 'number' ? body.experts : 5,
      rounds: typeof body.rounds === 'number' ? body.rounds : 3,
      user_id: user?.id ?? null,
      anthropic_api_key: apiKey
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
