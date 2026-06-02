import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DelphiReport } from '../types/index.js';

export type RunStatus = 'pending' | 'running' | 'completed' | 'error';

export interface RunRecord {
  id: string;
  user_id?: string | null;
  status: RunStatus;
  question: string;
  context?: string | null;
  experts: number;
  rounds: number;
  started_at: number; // epoch ms
  completed_at?: number | null;
  report?: DelphiReport | null;
  report_md?: string | null;
  total_tokens?: number | null;
  cost_usd?: number | null;
  error?: string | null;
}

export interface RunSummary {
  run_id: string;
  status: RunStatus;
  question: string;
  started_at: number;
  completed_at?: number | null;
}

export interface RunsRepo {
  create(input: Pick<RunRecord, 'id' | 'question' | 'context' | 'experts' | 'rounds' | 'user_id'>): Promise<void>;
  update(id: string, patch: Partial<RunRecord>): Promise<void>;
  get(id: string): Promise<RunRecord | null>;
  list(): Promise<RunSummary[]>;
  /** On boot, fail any runs left mid-flight by a previous process. */
  failInterrupted(): Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// In-memory repo — local dev / CLI `--api` without Supabase.
// ─────────────────────────────────────────────────────────────
class InMemoryRunsRepo implements RunsRepo {
  private runs = new Map<string, RunRecord>();

  async create(input: Pick<RunRecord, 'id' | 'question' | 'context' | 'experts' | 'rounds' | 'user_id'>): Promise<void> {
    this.runs.set(input.id, {
      ...input,
      status: 'pending',
      started_at: Date.now()
    });
  }

  async update(id: string, patch: Partial<RunRecord>): Promise<void> {
    const existing = this.runs.get(id);
    if (existing) this.runs.set(id, { ...existing, ...patch });
  }

  async get(id: string): Promise<RunRecord | null> {
    return this.runs.get(id) ?? null;
  }

  async list(): Promise<RunSummary[]> {
    return Array.from(this.runs.values())
      .sort((a, b) => b.started_at - a.started_at)
      .map(toSummary);
  }

  async failInterrupted(): Promise<void> {
    /* nothing persists across restarts in-memory */
  }
}

// ─────────────────────────────────────────────────────────────
// Supabase repo — hosted deployment. Survives restarts.
// ─────────────────────────────────────────────────────────────
class SupabaseRunsRepo implements RunsRepo {
  private client: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SupabaseRunsRepo requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }
    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }

  async create(input: Pick<RunRecord, 'id' | 'question' | 'context' | 'experts' | 'rounds' | 'user_id'>): Promise<void> {
    const { error } = await this.client.from('runs').insert({
      id: input.id,
      user_id: input.user_id ?? null,
      question: input.question,
      context: input.context ?? null,
      experts: input.experts,
      rounds: input.rounds,
      status: 'pending'
    });
    if (error) throw new Error(`runs.create failed: ${error.message}`);
  }

  async update(id: string, patch: Partial<RunRecord>): Promise<void> {
    const row: Record<string, unknown> = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.error !== undefined) row.error = patch.error;
    if (patch.report !== undefined) row.report = patch.report;
    if (patch.report_md !== undefined) row.report_md = patch.report_md;
    if (patch.total_tokens !== undefined) row.total_tokens = patch.total_tokens;
    if (patch.cost_usd !== undefined) row.cost_usd = patch.cost_usd;
    if (patch.completed_at !== undefined) {
      row.completed_at = patch.completed_at ? new Date(patch.completed_at).toISOString() : null;
    }
    const { error } = await this.client.from('runs').update(row).eq('id', id);
    if (error) throw new Error(`runs.update failed: ${error.message}`);
  }

  async get(id: string): Promise<RunRecord | null> {
    const { data, error } = await this.client.from('runs').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return rowToRecord(data);
  }

  async list(): Promise<RunSummary[]> {
    const { data, error } = await this.client
      .from('runs')
      .select('id, status, question, started_at, completed_at')
      .order('started_at', { ascending: false })
      .limit(200);
    if (error || !data) return [];
    return data.map(d => ({
      run_id: d.id,
      status: d.status,
      question: d.question,
      started_at: new Date(d.started_at).getTime(),
      completed_at: d.completed_at ? new Date(d.completed_at).getTime() : null
    }));
  }

  async failInterrupted(): Promise<void> {
    await this.client
      .from('runs')
      .update({ status: 'error', error: 'Interrupted by server restart', completed_at: new Date().toISOString() })
      .in('status', ['pending', 'running']);
  }
}

function toSummary(r: RunRecord): RunSummary {
  return {
    run_id: r.id,
    status: r.status,
    question: r.question,
    started_at: r.started_at,
    completed_at: r.completed_at ?? null
  };
}

function rowToRecord(d: Record<string, any>): RunRecord {
  return {
    id: d.id,
    user_id: d.user_id,
    status: d.status,
    question: d.question,
    context: d.context,
    experts: d.experts,
    rounds: d.rounds,
    started_at: new Date(d.started_at).getTime(),
    completed_at: d.completed_at ? new Date(d.completed_at).getTime() : null,
    report: d.report,
    report_md: d.report_md,
    total_tokens: d.total_tokens,
    cost_usd: d.cost_usd,
    error: d.error
  };
}

let cached: RunsRepo | null = null;

/** Returns the configured runs repository (memoised). */
export function getRunsRepo(): RunsRepo {
  if (cached) return cached;
  const useSupabase =
    (process.env.DELPHI_STORE || '').toLowerCase() === 'supabase' || !!process.env.SUPABASE_URL;
  cached = useSupabase ? new SupabaseRunsRepo() : new InMemoryRunsRepo();
  return cached;
}
