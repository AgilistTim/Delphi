import { useEffect, useState } from "react";
import { useParams, Link } from "../lib/router";
import { supabase } from "../lib/supabase";

interface ProgressEntry {
  phase: string;
  detail: string;
  timestamp: string;
}

interface RunDetail {
  id: string;
  question: string;
  context: string | null;
  status: "pending" | "running" | "completed" | "error";
  started_at: string;
  completed_at: string | null;
  total_tokens: number | null;
  cost_usd: number | null;
  report: any;
  report_md: string | null;
  error: string | null;
  progress: ProgressEntry[] | null;
}

export function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    loadRun();
    const interval = setInterval(loadRun, 2000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (run?.status === "pending" || run?.status === "running") {
      const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [run?.status]);

  async function loadRun() {
    const { data } = await supabase
      .from("runs")
      .select("*")
      .eq("id", id!)
      .maybeSingle();
    if (data) setRun(data as RunDetail);
    setLoading(false);
  }

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /></div>;
  }

  if (!run) {
    return (
      <div className="session-error">
        <h2>Session not found</h2>
        <Link to="/app" className="btn btn-secondary">Back to dashboard</Link>
      </div>
    );
  }

  if (run.status === "error") {
    return (
      <div className="session-page">
        <header className="page-header">
          <div>
            <h1 className="page-title">Error</h1>
            <p className="page-subtitle">{run.question}</p>
          </div>
        </header>
        <div className="alert alert-error">
          <strong>Deliberation failed:</strong> {run.error || "Unknown error"}
        </div>
        {run.progress && run.progress.length > 0 && (
          <ProgressLog entries={run.progress} />
        )}
        <Link to="/app" className="btn btn-secondary" style={{ marginTop: 16 }}>Back to dashboard</Link>
      </div>
    );
  }

  if (run.status === "completed") {
    return <CompletedSession run={run} />;
  }

  const progress = run.progress || [];
  const hasProgress = progress.length > 0;
  const latestPhase = hasProgress ? progress[progress.length - 1] : null;

  return (
    <div className="session-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Deliberation in progress</h1>
          <p className="page-subtitle">{run.question}</p>
        </div>
        <span className="badge badge-info">{run.status}</span>
      </header>

      <div className="deliberation-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${estimateProgress(progress)}%` }} />
        </div>
        <div className="progress-meta">
          <span>{formatTime(elapsed)} elapsed</span>
          {latestPhase && <span className="progress-current-phase">{phaseLabel(latestPhase.phase)}</span>}
        </div>
      </div>

      {hasProgress ? (
        <ProgressLog entries={progress} />
      ) : (
        <div className="deliberation-waiting">
          <div className="loading-spinner" />
          <p>Waiting for engine to start processing...</p>
          <p className="deliberation-note">
            Make sure you have an Anthropic API key configured in Settings.
          </p>
          <RetryButton runId={run.id} />
        </div>
      )}

      <p className="deliberation-note" style={{ marginTop: 24 }}>
        This page updates automatically every 2 seconds.
      </p>
    </div>
  );
}

function ProgressLog({ entries }: { entries: ProgressEntry[] }) {
  return (
    <div className="progress-log">
      {entries.map((entry, i) => (
        <div key={i} className={`progress-entry ${i === entries.length - 1 ? "progress-entry-latest" : ""}`}>
          <div className="progress-entry-header">
            <span className={`progress-phase-badge ${phaseColor(entry.phase)}`}>
              {phaseLabel(entry.phase)}
            </span>
            <span className="progress-entry-time">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className="progress-entry-detail">{entry.detail}</div>
        </div>
      ))}
    </div>
  );
}

function phaseLabel(phase: string): string {
  if (phase === "init") return "Init";
  if (phase === "personas") return "Personas";
  if (phase === "panel_assembled") return "Panel";
  if (phase.startsWith("round_") && phase.endsWith("_start")) return `Round ${phase.match(/\d+/)?.[0]} Start`;
  if (phase.startsWith("round_") && phase.endsWith("_responses")) return `Round ${phase.match(/\d+/)?.[0]} Responses`;
  if (phase.startsWith("round_") && phase.endsWith("_synthesis")) return `Round ${phase.match(/\d+/)?.[0]} Synthesis`;
  if (phase.startsWith("round_") && phase.endsWith("_complete")) return `Round ${phase.match(/\d+/)?.[0]} Complete`;
  if (phase === "convergence") return "Convergence";
  if (phase === "stress_tests") return "Stress Tests";
  if (phase === "stress_tests_complete") return "Stress Tests";
  if (phase === "final_synthesis") return "Final";
  if (phase === "complete") return "Done";
  return phase;
}

function phaseColor(phase: string): string {
  if (phase === "complete") return "progress-phase-success";
  if (phase === "panel_assembled") return "progress-phase-info";
  if (phase.includes("synthesis") || phase.includes("complete")) return "progress-phase-accent";
  if (phase.includes("stress")) return "progress-phase-warning";
  return "";
}

function estimateProgress(entries: ProgressEntry[]): number {
  if (entries.length === 0) return 2;
  const last = entries[entries.length - 1].phase;
  if (last === "complete") return 100;
  if (last === "final_synthesis") return 90;
  if (last.includes("stress")) return 80;
  if (last === "convergence") return 75;
  const roundMatch = last.match(/round_(\d+)/);
  if (roundMatch) {
    const round = parseInt(roundMatch[1]);
    const base = 15 + (round - 1) * 20;
    if (last.endsWith("_complete")) return base + 18;
    if (last.endsWith("_synthesis")) return base + 12;
    if (last.endsWith("_responses")) return base + 8;
    if (last.endsWith("_start")) return base;
    return base;
  }
  if (last === "panel_assembled") return 12;
  if (last === "personas") return 8;
  if (last === "init") return 5;
  return 10;
}

function CompletedSession({ run }: { run: RunDetail }) {
  const report = run.report;

  return (
    <div className="session-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Completed</h1>
          <p className="page-subtitle">{run.question}</p>
        </div>
        <span className="badge badge-success">completed</span>
      </header>

      <div className="session-meta-grid">
        <div className="meta-item">
          <span className="meta-label">Started</span>
          <span className="meta-value">{new Date(run.started_at).toLocaleString()}</span>
        </div>
        {run.completed_at && (
          <div className="meta-item">
            <span className="meta-label">Completed</span>
            <span className="meta-value">{new Date(run.completed_at).toLocaleString()}</span>
          </div>
        )}
        {run.total_tokens && (
          <div className="meta-item">
            <span className="meta-label">Tokens</span>
            <span className="meta-value">{(run.total_tokens / 1000).toFixed(1)}k</span>
          </div>
        )}
        {run.cost_usd && (
          <div className="meta-item">
            <span className="meta-label">Cost</span>
            <span className="meta-value">${Number(run.cost_usd).toFixed(2)}</span>
          </div>
        )}
      </div>

      {report?.convergence_analysis && (
        <div className="report-consensus">
          <div className="consensus-header">
            <span className="consensus-type">{report.convergence_analysis.consensus_type}</span>
            {report.convergence_analysis.confidence_score && (
              <span className="consensus-score">{report.convergence_analysis.confidence_score}/10</span>
            )}
          </div>
          {report.convergence_analysis.consensus_statement && (
            <p className="consensus-statement">{report.convergence_analysis.consensus_statement}</p>
          )}
        </div>
      )}

      {report?.stress_tests && report.stress_tests.length > 0 && (
        <div className="report-section">
          <h3>Stress Tests</h3>
          <div className="stress-results">
            {report.stress_tests.map((test: any, i: number) => (
              <div key={i} className="stress-result-item">
                <strong>{test.type || test.name}:</strong> {test.finding || test.result}
              </div>
            ))}
          </div>
        </div>
      )}

      {report?.decision_canvas && (
        <div className="report-section">
          <h3>Decision Canvas</h3>
          {report.decision_canvas.recommendation && (
            <p><strong>Recommendation:</strong> {report.decision_canvas.recommendation}</p>
          )}
          {report.decision_canvas.monitoring_signals && (
            <div>
              <strong>Monitor:</strong>
              <ul>
                {report.decision_canvas.monitoring_signals.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {run.progress && run.progress.length > 0 && (
        <details className="report-raw" style={{ marginTop: 24 }}>
          <summary>Deliberation log ({run.progress.length} steps)</summary>
          <ProgressLog entries={run.progress} />
        </details>
      )}

      {run.report_md && (
        <details className="report-raw">
          <summary>Full report (markdown)</summary>
          <pre className="report-md">{run.report_md}</pre>
        </details>
      )}

      <Link to="/app" className="btn btn-secondary" style={{ marginTop: 24 }}>Back to dashboard</Link>
    </div>
  );
}

function RetryButton({ runId }: { runId: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function trigger() {
    setStatus("sending");
    setErrorMsg("");
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/run-engine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": anonKey,
        },
        body: JSON.stringify({ run_id: runId }),
      });
      if (!res.ok) {
        const body = await res.text();
        setStatus("error");
        setErrorMsg(`${res.status}: ${body.slice(0, 200)}`);
      } else {
        setStatus("sent");
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message || "Network error");
    }
  }

  if (status === "sent") {
    return <p className="deliberation-note" style={{ color: "var(--success)" }}>Engine triggered -- progress should appear shortly.</p>;
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button
        className="btn btn-secondary"
        onClick={trigger}
        disabled={status === "sending"}
      >
        {status === "sending" ? "Triggering..." : "Retry: trigger engine"}
      </button>
      {status === "error" && (
        <p className="form-error" style={{ marginTop: 8, fontSize: 12 }}>{errorMsg}</p>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
