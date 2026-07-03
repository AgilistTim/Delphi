import { NextResponse } from 'next/server';
import { getRun } from '../../../lib/engine-proxy';
import { getUser } from '../../../lib/supabase/server';
import { createClient } from '../../../lib/supabase/server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const run = await getRun(params.id);
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(run);
}

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createClient();
  const { data: run, error: fetchErr } = await supabase
    .from('runs')
    .select('id, user_id, status')
    .eq('id', params.id)
    .maybeSingle();

  if (fetchErr || !run) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (run.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (run.status !== 'running' && run.status !== 'pending') {
    return NextResponse.json({ error: 'Run is not active', status: run.status }, { status: 409 });
  }

  const { error: updateErr } = await supabase
    .from('runs')
    .update({
      status: 'error',
      error: 'Stopped by user',
      completed_at: new Date().toISOString()
    })
    .eq('id', params.id);

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to stop run' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: 'stopped' });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createClient();
  const { data: run, error: fetchErr } = await supabase
    .from('runs')
    .select('id, user_id, status')
    .eq('id', params.id)
    .maybeSingle();

  if (fetchErr || !run) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (run.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (run.status === 'running' || run.status === 'pending') {
    return NextResponse.json(
      { error: 'Stop the run before deleting it' },
      { status: 409 }
    );
  }

  const { error: delErr } = await supabase.from('runs').delete().eq('id', params.id);

  if (delErr) {
    return NextResponse.json({ error: 'Failed to delete run' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
