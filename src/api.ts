import express from 'express';
import { randomUUID } from 'crypto';
import DelphiAgent from './main.js';
import { DelphiPrompt } from './types/index.js';
import { getRunsRepo } from './server/runs-repo.js';

/**
 * Ephemeral, per-instance log buffers used only for live SSE streaming of an
 * in-flight run. Durable run state (status, report, cost) lives in the runs
 * repository (Supabase in the hosted deployment), so completed runs survive
 * restarts even though their live log stream does not.
 */
interface LiveLog {
  logs: string[];
  status: 'pending' | 'running' | 'completed' | 'error';
}
const liveLogs = new Map<string, LiveLog>();

export function createDelphiAPI(_port: number = 3002): express.Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  const repo = getRunsRepo();

  app.post('/api/v1/analyze', async (req, res) => {
    const { question, context, constraints, experts, rounds, webhook_url, user_id } = req.body;

    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'question is required' });
      return;
    }

    const id = randomUUID();
    const prompt: DelphiPrompt = {
      question,
      context: context || undefined,
      constraints: constraints || undefined
    };

    const expertCount = Math.max(3, Math.min(10, experts || 5));
    const maxRounds = Math.max(1, Math.min(5, rounds || 3));

    try {
      await repo.create({
        id,
        question,
        context: context || null,
        experts: expertCount,
        rounds: maxRounds,
        user_id: user_id || null
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }

    liveLogs.set(id, { logs: [], status: 'pending' });
    res.json({ run_id: id, status: 'pending' });

    setImmediate(async () => {
      const live = liveLogs.get(id)!;
      live.status = 'running';
      await repo.update(id, { status: 'running' });

      const originalLog = console.log;
      const originalWarn = console.warn;
      console.log = (...args: unknown[]) => {
        live.logs.push(args.map(String).join(' '));
        originalLog(...args);
      };
      console.warn = (...args: unknown[]) => {
        live.logs.push(args.map(String).join(' '));
        originalWarn(...args);
      };

      try {
        const delphi = new DelphiAgent();
        delphi.setMaxRounds(maxRounds);
        const report = await delphi.runDelphiProcess(prompt, expertCount);
        const report_md = delphi.renderMarkdown(report);
        live.status = 'completed';
        await repo.update(id, {
          status: 'completed',
          report,
          report_md,
          total_tokens: report.cost_summary?.total_tokens ?? null,
          cost_usd: report.cost_summary?.estimated_total_cost_usd ?? null,
          completed_at: Date.now()
        });
      } catch (err: unknown) {
        live.status = 'error';
        await repo.update(id, {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
          completed_at: Date.now()
        });
      } finally {
        console.log = originalLog;
        console.warn = originalWarn;
      }

      if (webhook_url) {
        try {
          await fetch(webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ run_id: id, status: live.status, completed_at: Date.now() })
          });
        } catch {
          // webhook delivery is best-effort
        }
      }
    });
  });

  app.get('/api/v1/runs/:id', async (req, res) => {
    const run = await repo.get(req.params.id);
    if (!run) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }

    const response: Record<string, unknown> = {
      run_id: run.id,
      status: run.status,
      question: run.question,
      started_at: run.started_at,
      completed_at: run.completed_at ?? undefined
    };
    if (run.status === 'completed' && run.report) {
      response.report = run.report;
    }
    if (run.status === 'error') {
      response.error = run.error;
    }
    res.json(response);
  });

  app.get('/api/v1/runs/:id/stream', async (req, res) => {
    const run = await repo.get(req.params.id);
    if (!run) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    const live = liveLogs.get(req.params.id);

    // If we have no live buffer (run on another instance or already finished),
    // emit a terminal event derived from durable state and close.
    if (!live) {
      res.write(`data: ${JSON.stringify({ type: 'end', status: run.status })}\n\n`);
      res.end();
      return;
    }

    let lastIndex = 0;
    const interval = setInterval(() => {
      while (lastIndex < live.logs.length) {
        res.write(`data: ${JSON.stringify({ type: 'log', message: live.logs[lastIndex] })}\n\n`);
        lastIndex++;
      }
      if (live.status === 'completed' || live.status === 'error') {
        res.write(`data: ${JSON.stringify({ type: 'end', status: live.status })}\n\n`);
        clearInterval(interval);
        clearInterval(keepAlive);
        res.end();
      }
    }, 500);

    const keepAlive = setInterval(() => res.write(': keep-alive\n\n'), 15000);

    req.on('close', () => {
      clearInterval(interval);
      clearInterval(keepAlive);
    });
  });

  app.get('/api/v1/runs', async (_req, res) => {
    const runs = await repo.list();
    res.json({ runs });
  });

  app.get('/api/v1/health', async (_req, res) => {
    try {
      const delphi = new DelphiAgent();
      const health = await delphi.healthCheck();
      res.json({ status: 'ok', services: health });
    } catch (err: unknown) {
      res.status(500).json({
        status: 'error',
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  return app;
}

if (process.argv[1]?.endsWith('api.ts') || process.argv[1]?.endsWith('api.js')) {
  // Render injects PORT; fall back to DELPHI_API_PORT for local dev.
  const port = parseInt(process.env.PORT || process.env.DELPHI_API_PORT || '3002', 10);
  const app = createDelphiAPI(port);

  // Clean up any runs left mid-flight by a previous process before serving.
  getRunsRepo()
    .failInterrupted()
    .catch(err => console.warn('[boot] failInterrupted skipped:', err?.message || err));

  app.listen(port, '0.0.0.0', () => {
    console.log(`Delphi REST API listening on http://0.0.0.0:${port}`);
    console.log(`  POST /api/v1/analyze         - Start a new analysis`);
    console.log(`  GET  /api/v1/runs/:id        - Get run status/results`);
    console.log(`  GET  /api/v1/runs/:id/stream - SSE live progress`);
    console.log(`  GET  /api/v1/runs            - List all runs`);
    console.log(`  GET  /api/v1/health          - Health check`);
  });
}
