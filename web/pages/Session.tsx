import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link } from "../lib/router";
import { supabase } from "../lib/supabase";
import MarkdownIt from "markdown-it";

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

      <StopButton runId={run.id} onStopped={loadRun} />

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
  const reportRef = useRef<HTMLDivElement>(null);

  const md = useMemo(() => new MarkdownIt({ html: false, linkify: true, typographer: true }), []);
  const renderedHtml = useMemo(() => {
    if (!run.report_md) return "";
    return md.render(run.report_md);
  }, [run.report_md, md]);

  function handleDownloadPDF() {
    const content = reportRef.current?.innerHTML || "";
    const escQ = run.question.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const completedStr = run.completed_at ? new Date(run.completed_at).toLocaleString() : "N/A";
    const tokensStr = run.total_tokens ? (run.total_tokens / 1000).toFixed(1) + "k" : "";
    const costStr = run.cost_usd ? "$" + Number(run.cost_usd).toFixed(2) : "";

    const convergence = report?.convergence_analysis;
    const escType = (convergence?.consensus_type || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const escStatement = (convergence?.consensus_statement || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const scoreStr = convergence?.confidence_score ? String(convergence.confidence_score) : "";

    const verdictHtml = convergence
      ? '<div class="report-print-verdict">'
        + '<div class="type">' + escType + '</div>'
        + (scoreStr ? '<div class="score">Confidence: ' + scoreStr + '/10</div>' : '')
        + (escStatement ? '<div class="statement">' + escStatement + '</div>' : '')
        + '</div>'
      : '';

    const parts = [
      '<!DOCTYPE html><html><head>',
      '<meta charset="utf-8">',
      '<title>Delphi Report</title>',
      '<style>',
      '* { margin: 0; padding: 0; box-sizing: border-box; }',
      'body { font-family: Georgia, "Times New Roman", serif; line-height: 1.7; color: #1a1a1a; padding: 48px; max-width: 800px; margin: 0 auto; }',
      '.report-print-header { border-bottom: 2px solid #1a1a1a; padding-bottom: 24px; margin-bottom: 32px; }',
      '.report-print-header h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }',
      '.report-print-header .meta { font-size: 12px; color: #666; display: flex; gap: 16px; }',
      '.report-print-verdict { background: #f0f7f0; border-left: 4px solid #22863a; padding: 16px 20px; margin-bottom: 32px; border-radius: 0 6px 6px 0; }',
      '.report-print-verdict .type { font-weight: 700; font-size: 14px; color: #22863a; text-transform: uppercase; letter-spacing: 0.5px; }',
      '.report-print-verdict .score { font-size: 13px; color: #555; margin-top: 4px; }',
      '.report-print-verdict .statement { margin-top: 8px; font-style: italic; color: #333; }',
      '.report-print-body h1 { font-size: 22px; margin: 32px 0 12px; font-weight: 700; border-bottom: 1px solid #eee; padding-bottom: 6px; }',
      '.report-print-body h2 { font-size: 18px; margin: 28px 0 10px; font-weight: 600; }',
      '.report-print-body h3 { font-size: 15px; margin: 20px 0 8px; font-weight: 600; }',
      '.report-print-body p { margin: 0 0 12px; font-size: 14px; }',
      '.report-print-body ul, .report-print-body ol { margin: 0 0 12px 20px; font-size: 14px; }',
      '.report-print-body li { margin-bottom: 4px; }',
      '.report-print-body blockquote { border-left: 3px solid #ddd; padding-left: 12px; color: #555; margin: 12px 0; font-style: italic; }',
      '.report-print-body strong { font-weight: 700; }',
      '.report-print-body code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; font-size: 13px; }',
      '.report-print-body pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 12px 0; }',
      '.report-print-body pre code { background: none; padding: 0; }',
      '.report-print-body table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }',
      '.report-print-body th, .report-print-body td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }',
      '.report-print-body th { background: #f9f9f9; font-weight: 600; }',
      '.report-print-footer { border-top: 1px solid #ddd; margin-top: 40px; padding-top: 16px; font-size: 11px; color: #999; text-align: center; }',
      '@media print { body { padding: 24px; } @page { margin: 1.5cm; } }',
      '</style></head><body>',
      '<div class="report-print-header">',
      '<h1>' + escQ + '</h1>',
      '<div class="meta">',
      '<span>Completed: ' + completedStr + '</span>',
      tokensStr ? '<span>Tokens: ' + tokensStr + '</span>' : '',
      costStr ? '<span>Cost: ' + costStr + '</span>' : '',
      '</div></div>',
      verdictHtml,
      '<div class="report-print-body">',
      content,
      '</div>',
      '<div class="report-print-footer">Generated by Delphi Agent &middot; AI-Augmented Expert Deliberation</div>',
      '</body></html>',
    ];

    const html = parts.join("\n");
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return;
    }
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    iframe.onload = function() {
      setTimeout(function() {
        iframe.contentWindow?.print();
        setTimeout(function() { document.body.removeChild(iframe); }, 1000);
      }, 250);
    };

    // Fallback if onload already fired (some browsers)
    setTimeout(function() {
      if (document.body.contains(iframe)) {
        try { iframe.contentWindow?.print(); } catch (_) {}
        setTimeout(function() {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 1000);
      }
    }, 800);
  }

  return (
    <div className="session-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Completed</h1>
          <p className="page-subtitle">{run.question}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {run.report_md && (
            <button className="btn btn-primary" onClick={handleDownloadPDF}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0L5 7.5M8 10l3-2.5M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Download PDF
            </button>
          )}
          <span className="badge badge-success">completed</span>
        </div>
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
        <div className="report-verdict-card">
          <div className="verdict-header">
            <span className="verdict-type">{report.convergence_analysis.consensus_type}</span>
            {report.convergence_analysis.confidence_score && (
              <span className="verdict-score">
                <span className="verdict-score-value">{report.convergence_analysis.confidence_score}</span>
                <span className="verdict-score-max">/10</span>
              </span>
            )}
          </div>
          {report.convergence_analysis.consensus_statement && (
            <p className="verdict-statement">{report.convergence_analysis.consensus_statement}</p>
          )}
        </div>
      )}

      {report?.stress_tests && report.stress_tests.length > 0 && (
        <div className="report-section-card">
          <h3 className="section-card-title">Stress Tests</h3>
          <div className="stress-results-grid">
            {report.stress_tests.map((test: any, i: number) => (
              <div key={i} className="stress-result-card">
                <span className="stress-result-type">{test.type || test.name}</span>
                <p className="stress-result-finding">{test.finding || test.result}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {report?.decision_canvas && (
        <div className="report-section-card">
          <h3 className="section-card-title">Decision Canvas</h3>
          {report.decision_canvas.recommendation && (
            <div className="canvas-recommendation">
              <span className="canvas-label">Recommendation</span>
              <p>{report.decision_canvas.recommendation}</p>
            </div>
          )}
          {report.decision_canvas.monitoring_signals && (
            <div className="canvas-signals">
              <span className="canvas-label">Monitoring Signals</span>
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
        <div className="report-full-card">
          <div className="report-full-header">
            <h3 className="section-card-title">Full Analysis Report</h3>
          </div>
          <div
            ref={reportRef}
            className="report-rendered-md"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>
      )}

      {run.progress && run.progress.length > 0 && (
        <details className="report-details-section">
          <summary>Deliberation log ({run.progress.length} steps)</summary>
          <ProgressLog entries={run.progress} />
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

function StopButton({ runId, onStopped }: { runId: string; onStopped: () => void }) {
  const [status, setStatus] = useState<"idle" | "confirming" | "stopping" | "done">("idle");

  if (status === "done") return null;

  if (status === "confirming") {
    return (
      <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 13 }}>Stop this deliberation?</span>
        <button
          className="btn btn-danger"
          onClick={async () => {
            setStatus("stopping");
            const { error } = await supabase
              .from("runs")
              .update({ status: "error", error: "Stopped by user", completed_at: new Date().toISOString() })
              .eq("id", runId);
            if (!error) {
              setStatus("done");
              onStopped();
            } else {
              setStatus("idle");
            }
          }}
        >
          Yes, stop it
        </button>
        <button className="btn btn-secondary" onClick={() => setStatus("idle")}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      className="btn btn-danger"
      style={{ marginTop: 16 }}
      disabled={status === "stopping"}
      onClick={() => setStatus("confirming")}
    >
      {status === "stopping" ? "Stopping..." : "Stop run"}
    </button>
  );
}
