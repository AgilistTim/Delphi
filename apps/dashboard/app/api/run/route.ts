import { NextResponse } from 'next/server';
import path from 'path';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

type RunStatus = 'running' | 'completed' | 'error';

type RunRecord = {
  id: string;
  proc: ChildProcessWithoutNullStreams;
  emitter: EventEmitter;
  startedAt: number;
  status: RunStatus;
};

const runs = new Map<string, RunRecord>();
export const runtime = 'nodejs';

/**
 * Start a new Delphi run by spawning the CLI with provided params.
 * Body: { question: string, context?: string, experts?: number, rounds?: number }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { question, context, experts, rounds } = body || {};

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // Resolve project root (dashboard cwd is apps/dashboard)
    const projectRoot = path.resolve(process.cwd(), '..', '..');
    const tsxBin = path.join(
      projectRoot,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'tsx.cmd' : 'tsx'
    );
    const cliPath = path.join(projectRoot, 'src', 'cli.ts');

    const args: string[] = [cliPath, '--question', question];
    if (context) args.push('--context', String(context));
    if (experts) args.push('--experts', String(experts));
    if (rounds) args.push('--rounds', String(rounds));

    const id = randomUUID();
    const emitter = new EventEmitter();

    const proc = spawn(tsxBin, args, {
      cwd: projectRoot,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    proc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      emitter.emit('data', text);
    });
    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      emitter.emit('data', text);
    });
    proc.on('close', (code) => {
      emitter.emit('data', `\n[process exited with code ${code}]\n`);
      emitter.emit('end');
      const rec = runs.get(id);
      if (rec) {
        rec.status = code === 0 ? 'completed' : 'error';
      }
    });
    proc.on('error', (err) => {
      emitter.emit('data', `\n[process error: ${err instanceof Error ? err.message : String(err)}]\n`);
      emitter.emit('end');
      const rec = runs.get(id);
      if (rec) rec.status = 'error';
    });

    runs.set(id, { id, proc, emitter, startedAt: Date.now(), status: 'running' });

    return NextResponse.json({ runId: id });
  } catch (err) {
    console.error('Error starting run:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Optional: stop a running process
 * DELETE /api/run?runId=...
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('runId');
    if (!id) {
      return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
    }
    const rec = runs.get(id);
    if (!rec) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }
    rec.proc.kill('SIGINT');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error stopping run:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Helper used by the SSE stream route
export function getRunRecord(runId: string): RunRecord | undefined {
  return runs.get(runId);
}
