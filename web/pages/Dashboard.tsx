import { useEffect, useState } from "react";
import { Link } from "../lib/router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";

interface RunItem {
  id: string;
  question: string;
  status: "pending" | "running" | "completed" | "error";
  started_at: string;
  total_tokens: number | null;
  report: any;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    async function load() {
      const [runsRes, keyRes] = await Promise.all([
        supabase
          .from("runs")
          .select("id, question, status, started_at, total_tokens, report")
          .order("started_at", { ascending: false })
          .limit(50),
        supabase
          .from("user_keys")
          .select("user_id")
          .eq("user_id", user!.id)
          .maybeSingle()
      ]);
      setRuns(runsRes.data ?? []);
      setHasKey(!!keyRes.data);
      setLoading(false);
    }
    load();
  }, [user]);

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      pending: "badge-warn",
      running: "badge-info",
      completed: "badge-success",
      error: "badge-error"
    };
    return <span className={`badge ${map[status] || ""}`}>{status}</span>;
  }

  function verdict(report: any): string | null {
    return report?.convergence_analysis?.consensus_type ?? null;
  }

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="dashboard">
      <header className="page-header">
        <div>
          <h1 className="page-title">Decisions</h1>
          <p className="page-subtitle">Your structured AI deliberation sessions</p>
        </div>
        <Link to="/app/new" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          New Decision
        </Link>
      </header>

      {!hasKey && (
        <div className="alert alert-warn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 5v3m0 2.5h.01M2.5 13h11L8 3 2.5 13z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div>
            <strong>API key required</strong> &mdash; Add your Anthropic API key in{" "}
            <Link to="/app/settings">Settings</Link> to start running decisions.
          </div>
        </div>
      )}

      {runs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="6" y="10" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="2"/><path d="M6 18h36M18 18v20" stroke="currentColor" strokeWidth="2"/></svg>
          </div>
          <h3>No decisions yet</h3>
          <p>Submit your first question and let a panel of AI experts deliberate on it.</p>
          <Link to="/app/new" className="btn btn-primary">Create your first decision</Link>
        </div>
      ) : (
        <div className="runs-list">
          {runs.map((run) => (
            <Link
              key={run.id}
              to={`/app/s/${run.id}`}
              className="run-card"
            >
              <div className="run-card-top">
                <h3 className="run-question">{run.question}</h3>
                {statusBadge(run.status)}
              </div>
              <div className="run-card-meta">
                <span>{new Date(run.started_at).toLocaleDateString()}</span>
                {run.total_tokens && (
                  <span>{(run.total_tokens / 1000).toFixed(1)}k tokens</span>
                )}
                {verdict(run.report) && (
                  <span className="run-verdict">{verdict(run.report)}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
