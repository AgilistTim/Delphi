import { NextResponse } from 'next/server';
import path from 'path';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { getRunRecord, setRunRecord, type RunRecord } from './store';

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
    const record: RunRecord = { id, proc, emitter, startedAt: Date.now(), status: 'running' };
    setRunRecord(id, record);

    proc.on('close', (code) => {
      emitter.emit('data', `\n[process exited with code ${code}]\n`);
      emitter.emit('end');
      record.status = code === 0 ? 'completed' : 'error';
    });
    proc.on('error', (err) => {
      emitter.emit('data', `\n[process error: ${err instanceof Error ? err.message : String(err)}]\n`);
      emitter.emit('end');
      record.status = 'error';
    });

    return NextResponse.json({ runId: id });
  } catch (err) {
    console.error('Error starting run:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/run?runId=... - Stream SSE output for a running process
 * This handler is in the same file as POST to ensure they share the same module context
 * and globalThis state in Next.js dev mode.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get('runId');
    if (!runId) {
      return new Response('Missing runId', { status: 400 });
    }

    const rec = getRunRecord(runId);
    if (!rec) {
      return new Response('Run not found', { status: 404 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const send = (data: string, event?: string) => {
          const lines = data.split('\n').map((l) => `data: ${l}`).join('\n');
          const payload = (event ? `event: ${event}\n` : '') + `${lines}\n\n`;
          controller.enqueue(encoder.encode(payload));
        };

        send(JSON.stringify({ status: rec.status, startedAt: rec.startedAt }), 'status');

        const onData = (chunk: string) => {
          send(chunk);
        };

        const onEnd = () => {
          send(JSON.stringify({ status: rec.status }), 'end');
          controller.close();
          cleanup();
        };

        const cleanup = () => {
          rec.emitter.off('data', onData);
          rec.emitter.off('end', onEnd);
        };

        rec.emitter.on('data', onData);
        rec.emitter.on('end', onEnd);

        const interval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keep-alive\n\n'));
          } catch {
            // ignore
          }
        }, 15000);

        return () => {
          clearInterval(interval);
          cleanup();
        };
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
  } catch (err) {
    console.error('SSE stream error:', err);
    return new Response('Internal Server Error', { status: 500 });
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
    const rec = getRunRecord(id);
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
