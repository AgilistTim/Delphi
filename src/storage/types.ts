import { DelphiReport, PriorAnalysisReference, SignalTracker, Retrospective } from '../types/index.js';

/**
 * Lightweight summary of a stored report, used by listing views.
 */
export interface StoredReportSummary {
  slug: string;
  question: string;
  consensus_position: string;
  consensus_type?: string;
  created_at: string;
}

/**
 * Storage abstraction for everything the engine persists between runs.
 *
 * Two implementations exist:
 *  - FilesystemStore: writes to the local `output/` directory (CLI / dev default).
 *  - SupabaseStore: reads/writes Supabase Postgres tables (hosted web deployment).
 *
 * Selected at runtime by the DELPHI_STORE env var (`fs` | `supabase`).
 */
export interface Store {
  /**
   * Persist a completed report. `markdown` is the pre-rendered human-readable
   * form; `slug` is the stable identifier (filename stem in fs mode).
   * In Supabase mode this may be a no-op because the API layer owns the
   * canonical `runs` row — see SupabaseStore.
   */
  saveReport(report: DelphiReport, markdown: string, slug: string): Promise<{ slug: string }>;

  /** Persist raw agent logs for debugging. No-op in Supabase mode. */
  saveAgentLogs(logs: unknown[], question: string): Promise<void>;

  /** Find prior analyses semantically related to `question`. */
  findPriorAnalyses(question: string, maxResults?: number): Promise<PriorAnalysisReference[]>;

  loadSignalTrackers(): Promise<SignalTracker[]>;
  saveSignalTracker(tracker: SignalTracker): Promise<void>;

  loadRetrospectives(): Promise<Retrospective[]>;
  saveRetrospective(retrospective: Retrospective): Promise<void>;
}
