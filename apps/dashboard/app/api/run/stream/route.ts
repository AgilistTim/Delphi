import { getRunRecord } from '../route';
export const runtime = 'nodejs';

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

        // Initial status event
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

        // Heartbeat to keep connection alive
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
