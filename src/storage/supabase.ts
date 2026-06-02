import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DelphiReport, PriorAnalysisReference, SignalTracker, Retrospective } from '../types/index.js';
import { Store } from './types.js';

/**
 * Supabase (Postgres) backed store for the hosted deployment.
 *
 * Note: the canonical report record is the `runs` row owned by the API layer
 * (src/api.ts), which writes the full report jsonb on completion. Therefore
 * `saveReport`/`saveAgentLogs` here are intentionally no-ops — the engine still
 * generates the markdown, but persistence of the report itself happens once,
 * in the API. Prior-analysis lookups read back from that same `runs` table.
 */
export class SupabaseStore implements Store {
  private client: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        'SupabaseStore requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables'
      );
    }
    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }

  // The API layer persists the canonical report row; nothing to do here.
  async saveReport(_report: DelphiReport, _markdown: string, slug: string): Promise<{ slug: string }> {
    return { slug };
  }

  // Agent logs are not persisted in the hosted deployment (kept lean).
  async saveAgentLogs(): Promise<void> {
    /* no-op */
  }

  async findPriorAnalyses(question: string, maxResults = 3): Promise<PriorAnalysisReference[]> {
    const { data, error } = await this.client
      .from('runs')
      .select('id, question, report')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(100);

    if (error || !data) return [];

    const questionWords = new Set(
      question.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    );

    const references: PriorAnalysisReference[] = [];
    for (const row of data) {
      const prevQuestion: string = row.question || row.report?.prompt?.question || '';
      const prevPosition: string = row.report?.consensus_summary?.final_position || '';
      if (!prevQuestion) continue;

      const prevWords = new Set(
        prevQuestion.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3)
      );
      const overlap = [...questionWords].filter(w => prevWords.has(w));
      const relevance_score = overlap.length / Math.max(questionWords.size, 1);

      if (relevance_score > 0.15) {
        references.push({
          slug: row.id,
          question: prevQuestion,
          consensus_position: prevPosition,
          relevance_score,
          relevance_rationale: `Shares ${overlap.length} key terms: ${overlap.slice(0, 5).join(', ')}`
        });
      }
    }

    return references
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, maxResults);
  }

  async loadSignalTrackers(): Promise<SignalTracker[]> {
    const { data, error } = await this.client
      .from('signal_trackers')
      .select('data')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(row => row.data as SignalTracker);
  }

  async saveSignalTracker(tracker: SignalTracker): Promise<void> {
    await this.client
      .from('signal_trackers')
      .upsert(
        { report_slug: tracker.report_slug, data: tracker },
        { onConflict: 'report_slug' }
      );
  }

  async loadRetrospectives(): Promise<Retrospective[]> {
    const { data, error } = await this.client
      .from('retrospectives')
      .select('data')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(row => row.data as Retrospective);
  }

  async saveRetrospective(retrospective: Retrospective): Promise<void> {
    await this.client
      .from('retrospectives')
      .upsert(
        { report_slug: retrospective.report_slug, data: retrospective },
        { onConflict: 'report_slug' }
      );
  }
}
