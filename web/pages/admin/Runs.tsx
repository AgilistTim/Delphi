import { useEffect, useState } from "react";
import { Link } from "../../lib/router";
import { supabase } from "../../lib/supabase";

interface RunRow {
  id: string;
  user_id: string | null;
  question: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  total_tokens: number | null;
  cost_usd: number | null;
  experts: number;
  rounds: number;
}

export function AdminRuns() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadRuns();
  }, []);

  async function loadRuns() {
    const { data } = await supabase
      .from("runs")
      .select("id, user_id, question, status, started_at, completed_at, total_tokens, cost_usd, experts, rounds")
      .order("started_at", { ascending: false })
      .limit(200);
    setRuns((data ?? []) as RunRow[]);
    setLoading(false);
  }

  const filtered = filter === "all" ? runs : runs.filter((r) => r.status === filter);

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="admin-runs">
      <header className="page-header">
        <div>
          <h1 className="page-title">All Runs</h1>
          <p className="page-subtitle">{runs.length} total sessions</p>
        </div>
      </header>

      <div className="admin-filters">
        {["all", "completed", "running", "pending", "error"].map((f) => (
          <button
            key={f}
            className={`admin-filter-btn ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
            <span className="admin-filter-count">
              {f === "all" ? runs.length : runs.filter((r) => r.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="admin-empty">No runs match this filter</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>User</th>
                <th>Status</th>
                <th>Experts</th>
                <th>Rounds</th>
                <th>Tokens</th>
                <th>Cost</th>
                <th>Started</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((run) => (
                <tr key={run.id}>
                  <td className="admin-table-question">
                    <Link to={`/app/s/${run.id}`}>{run.question}</Link>
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {run.user_id ? run.user_id.slice(0, 6) : "-"}
                  </td>
                  <td><span className={`badge badge-${statusClass(run.status)}`}>{run.status}</span></td>
                  <td>{run.experts}</td>
                  <td>{run.rounds}</td>
                  <td className="mono">{run.total_tokens ? `${(run.total_tokens / 1000).toFixed(1)}k` : "-"}</td>
                  <td className="mono">{run.cost_usd ? `$${Number(run.cost_usd).toFixed(2)}` : "-"}</td>
                  <td className="admin-table-date">{new Date(run.started_at).toLocaleString()}</td>
                  <td className="mono">{formatDuration(run.started_at, run.completed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function statusClass(status: string): string {
  const map: Record<string, string> = { completed: "success", running: "info", pending: "warn", error: "error" };
  return map[status] || "info";
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "-";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}
