import { createClient, isSupabaseConfigured } from "./supabase/server";

export interface RunRow {
  id: string;
  question: string;
  context: string | null;
  status: "pending" | "running" | "completed" | "error";
  started_at: string;
  completed_at: string | null;
  total_tokens: number | null;
  cost_usd: number | null;
  report: any | null;
  report_md: string | null;
  error: string | null;
}

export interface RunListItem {
  id: string;
  question: string;
  status: RunRow["status"];
  started_at: string;
  total_tokens: number | null;
  verdict: string | null;
}

function verdictOf(report: any): string | null {
  return report?.convergence_analysis?.consensus_type ?? null;
}

/** Runs visible to the current user (own + shared), newest first. */
export async function listRuns(): Promise<RunListItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("runs")
    .select("id, question, status, started_at, total_tokens, report")
    .order("started_at", { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    question: r.question,
    status: r.status,
    started_at: r.started_at,
    total_tokens: r.total_tokens,
    verdict: verdictOf(r.report)
  }));
}

/** Completed runs only — used by the portfolio view. */
export async function listCompletedRuns(): Promise<RunRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return data as RunRow[];
}

export async function getRunRow(id: string): Promise<RunRow | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data, error } = await supabase.from("runs").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data as RunRow;
}

export async function getSignalTrackers(): Promise<any[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("signal_trackers")
    .select("data")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((d) => d.data);
}

export async function getRetrospectives(): Promise<any[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("retrospectives")
    .select("data")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((d) => d.data);
}
