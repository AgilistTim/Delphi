import { useEffect, useState } from "react";
import { Link } from "../../lib/router";
import { supabase } from "../../lib/supabase";

interface Stats {
  totalRuns: number;
  completedRuns: number;
  runningRuns: number;
  errorRuns: number;
  totalTokens: number;
  totalCost: number;
  usersWithKeys: number;
  recentRuns: RecentRun[];
}

interface RecentRun {
  id: string;
  question: string;
  status: string;
  started_at: string;
  total_tokens: number | null;
  cost_usd: number | null;
  user_email?: string;
}

export function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const [runsRes, keysRes] = await Promise.all([
      supabase.from("runs").select("id, question, status, started_at, total_tokens, cost_usd"),
      supabase.from("user_keys").select("user_id"),
    ]);

    const runs = runsRes.data ?? [];
    const keys = keysRes.data ?? [];

    const totalTokens = runs.reduce((acc, r) => acc + (r.total_tokens || 0), 0);
    const totalCost = runs.reduce((acc, r) => acc + (Number(r.cost_usd) || 0), 0);

    setStats({
      totalRuns: runs.length,
      completedRuns: runs.filter((r) => r.status === "completed").length,
      runningRuns: runs.filter((r) => r.status === "running" || r.status === "pending").length,
      errorRuns: runs.filter((r) => r.status === "error").length,
      totalTokens,
      totalCost,
      usersWithKeys: keys.length,
      recentRuns: runs
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
        .slice(0, 10) as RecentRun[],
    });
    setLoading(false);
  }

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /></div>;
  }

  if (!stats) return null;

  return (
    <div className="admin-overview">
      <header className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Platform-wide metrics and activity</p>
        </div>
      </header>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-value">{stats.totalRuns}</div>
          <div className="admin-stat-label">Total Runs</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value admin-stat-success">{stats.completedRuns}</div>
          <div className="admin-stat-label">Completed</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value admin-stat-warning">{stats.runningRuns}</div>
          <div className="admin-stat-label">In Progress</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value admin-stat-error">{stats.errorRuns}</div>
          <div className="admin-stat-label">Errors</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{(stats.totalTokens / 1_000_000).toFixed(2)}M</div>
          <div className="admin-stat-label">Total Tokens</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">${stats.totalCost.toFixed(2)}</div>
          <div className="admin-stat-label">Total Cost</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{stats.usersWithKeys}</div>
          <div className="admin-stat-label">Users with Keys</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">
            {stats.totalRuns > 0 ? (stats.totalTokens / stats.totalRuns / 1000).toFixed(1) + "k" : "0"}
          </div>
          <div className="admin-stat-label">Avg Tokens/Run</div>
        </div>
      </div>

      <div className="admin-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">Recent Activity</h2>
          <Link to="/app/admin/runs" className="btn btn-secondary btn-sm">View all</Link>
        </div>

        {stats.recentRuns.length === 0 ? (
          <p className="admin-empty">No runs yet</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Status</th>
                  <th>Tokens</th>
                  <th>Cost</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentRuns.map((run) => (
                  <tr key={run.id}>
                    <td className="admin-table-question">
                      <Link to={`/app/s/${run.id}`}>{run.question}</Link>
                    </td>
                    <td><span className={`badge badge-${statusClass(run.status)}`}>{run.status}</span></td>
                    <td className="mono">{run.total_tokens ? `${(run.total_tokens / 1000).toFixed(1)}k` : "-"}</td>
                    <td className="mono">{run.cost_usd ? `$${Number(run.cost_usd).toFixed(2)}` : "-"}</td>
                    <td className="admin-table-date">{new Date(run.started_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function statusClass(status: string): string {
  const map: Record<string, string> = { completed: "success", running: "info", pending: "warn", error: "error" };
  return map[status] || "info";
}
