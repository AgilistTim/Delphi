import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

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
}

export function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    loadRun();
    const interval = setInterval(loadRun, 3000);
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
        <Link to="/app" className="btn btn-secondary">Back to dashboard</Link>
      </div>
    );
  }

  if (run.status === "completed") {
    return <CompletedSession run={run} />;
  }

  const progress = Math.min((elapsed / 360) * 100, 95);

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
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-meta">
          <span>{formatTime(elapsed)} elapsed</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      <div className="deliberation-phases">
        <Phase active={elapsed < 30} done={elapsed >= 30} label="Panel assembly" desc="Generating expert personas and initial research" />
        <Phase active={elapsed >= 30 && elapsed < 120} done={elapsed >= 120} label="Round 1" desc="Initial responses, synthesis, and stress tests" />
        <Phase active={elapsed >= 120 && elapsed < 210} done={elapsed >= 210} label="Round 2" desc="Refined positions and cross-examination" />
        <Phase active={elapsed >= 210} done={false} label="Final synthesis" desc="Decision canvas and oppositional case" />
      </div>

      <p className="deliberation-note">
        You can leave this page. The session will continue in the background.
      </p>
    </div>
  );
}

function Phase({ active, done, label, desc }: { active: boolean; done: boolean; label: string; desc: string }) {
  return (
    <div className={`phase ${active ? "phase-active" : ""} ${done ? "phase-done" : ""}`}>
      <div className="phase-indicator">
        {done ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : active ? (
          <div className="phase-dot active" />
        ) : (
          <div className="phase-dot" />
        )}
      </div>
      <div>
        <div className="phase-label">{label}</div>
        <div className="phase-desc">{desc}</div>
      </div>
    </div>
  );
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
            <span className="meta-value">${run.cost_usd.toFixed(2)}</span>
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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
