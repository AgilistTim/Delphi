import express from 'express';
import { randomUUID } from 'crypto';
import DelphiAgent from './main.js';
import { DelphiPrompt, DelphiReport } from './types/index.js';

interface RunState {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  question: string;
  startedAt: number;
  completedAt?: number;
  report?: DelphiReport;
  error?: string;
  logs: string[];
}

const runs = new Map<string, RunState>();

export function createDelphiAPI(_port: number = 3002): express.Express {
  const app = express();
  app.use(express.json());

  app.post('/api/v1/analyze', async (req, res) => {
    const { question, context, constraints, experts, rounds, webhook_url } = req.body;

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

    const state: RunState = {
      id,
      status: 'pending',
      question,
      startedAt: Date.now(),
      logs: []
    };
    runs.set(id, state);

    res.json({ run_id: id, status: 'pending' });

    setImmediate(async () => {
      state.status = 'running';
      const originalLog = console.log;
      const originalWarn = console.warn;

      console.log = (...args: unknown[]) => {
        const msg = args.map(String).join(' ');
        state.logs.push(msg);
        originalLog(...args);
      };
      console.warn = (...args: unknown[]) => {
        const msg = args.map(String).join(' ');
        state.logs.push(msg);
        originalWarn(...args);
      };

      try {
        const delphi = new DelphiAgent();
        delphi.setMaxRounds(maxRounds);
        const report = await delphi.runDelphiProcess(prompt, expertCount);
        state.report = report;
        state.status = 'completed';
        state.completedAt = Date.now();
      } catch (err: unknown) {
        state.status = 'error';
        state.error = err instanceof Error ? err.message : String(err);
        state.completedAt = Date.now();
      } finally {
        console.log = originalLog;
        console.warn = originalWarn;
      }

      if (webhook_url) {
        try {
          await fetch(webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              run_id: id,
              status: state.status,
              completed_at: state.completedAt
            })
          });
        } catch {
          // webhook delivery is best-effort
        }
      }
    });
  });

  app.get('/api/v1/runs/:id', (req, res) => {
    const state = runs.get(req.params.id);
    if (!state) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }

    const response: Record<string, unknown> = {
      run_id: state.id,
      status: state.status,
      question: state.question,
      started_at: state.startedAt,
      completed_at: state.completedAt
    };

    if (state.status === 'completed' && state.report) {
      response.report = state.report;
    }
    if (state.status === 'error') {
      response.error = state.error;
    }

    res.json(response);
  });

  app.get('/api/v1/runs/:id/stream', (req, res) => {
    const state = runs.get(req.params.id);
    if (!state) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    let lastIndex = 0;

    const interval = setInterval(() => {
      while (lastIndex < state.logs.length) {
        const line = state.logs[lastIndex];
        res.write(`data: ${JSON.stringify({ type: 'log', message: line })}\n\n`);
        lastIndex++;
      }

      if (state.status === 'completed' || state.status === 'error') {
        res.write(`data: ${JSON.stringify({ type: 'end', status: state.status })}\n\n`);
        clearInterval(interval);
        res.end();
      }
    }, 500);

    const keepAlive = setInterval(() => {
      res.write(': keep-alive\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(interval);
      clearInterval(keepAlive);
    });
  });

  app.get('/api/v1/runs', (_req, res) => {
    const allRuns = Array.from(runs.values()).map(s => ({
      run_id: s.id,
      status: s.status,
      question: s.question,
      started_at: s.startedAt,
      completed_at: s.completedAt
    }));
    allRuns.sort((a, b) => b.started_at - a.started_at);
    res.json({ runs: allRuns });
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
  const port = parseInt(process.env.DELPHI_API_PORT || '3002', 10);
  const app = createDelphiAPI(port);
  app.listen(port, () => {
    console.log(`Delphi REST API listening on http://localhost:${port}`);
    console.log(`  POST /api/v1/analyze       - Start a new analysis`);
    console.log(`  GET  /api/v1/runs/:id       - Get run status/results`);
    console.log(`  GET  /api/v1/runs/:id/stream - SSE live progress`);
    console.log(`  GET  /api/v1/runs           - List all runs`);
    console.log(`  GET  /api/v1/health         - Health check`);
  });
}
