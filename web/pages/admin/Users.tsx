import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface UserRow {
  user_id: string;
  has_key: boolean;
  run_count: number;
  total_tokens: number;
  total_cost: number;
  last_run_at: string | null;
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const [runsRes, keysRes] = await Promise.all([
      supabase.from("runs").select("user_id, total_tokens, cost_usd, started_at"),
      supabase.from("user_keys").select("user_id"),
    ]);

    const runs = runsRes.data ?? [];
    const keys = new Set((keysRes.data ?? []).map((k) => k.user_id));

    const userMap = new Map<string, UserRow>();
    for (const run of runs) {
      if (!run.user_id) continue;
      const existing = userMap.get(run.user_id);
      if (existing) {
        existing.run_count++;
        existing.total_tokens += run.total_tokens || 0;
        existing.total_cost += Number(run.cost_usd) || 0;
        if (run.started_at > (existing.last_run_at || "")) {
          existing.last_run_at = run.started_at;
        }
      } else {
        userMap.set(run.user_id, {
          user_id: run.user_id,
          has_key: keys.has(run.user_id),
          run_count: 1,
          total_tokens: run.total_tokens || 0,
          total_cost: Number(run.cost_usd) || 0,
          last_run_at: run.started_at,
        });
      }
    }

    // Add users who have keys but no runs
    for (const uid of keys) {
      if (!userMap.has(uid)) {
        userMap.set(uid, {
          user_id: uid,
          has_key: true,
          run_count: 0,
          total_tokens: 0,
          total_cost: 0,
          last_run_at: null,
        });
      }
    }

    setUsers(
      Array.from(userMap.values()).sort((a, b) => (b.last_run_at || "").localeCompare(a.last_run_at || ""))
    );
    setLoading(false);
  }

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="admin-users">
      <header className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">{users.length} users with activity or API keys</p>
        </div>
      </header>

      {users.length === 0 ? (
        <p className="admin-empty">No users with activity yet</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>API Key</th>
                <th>Runs</th>
                <th>Tokens</th>
                <th>Cost</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td className="mono" style={{ fontSize: 12 }}>{u.user_id.slice(0, 8)}...</td>
                  <td>
                    {u.has_key ? (
                      <span className="badge badge-success">configured</span>
                    ) : (
                      <span className="badge badge-warn">none</span>
                    )}
                  </td>
                  <td>{u.run_count}</td>
                  <td className="mono">{u.total_tokens > 0 ? `${(u.total_tokens / 1000).toFixed(1)}k` : "-"}</td>
                  <td className="mono">{u.total_cost > 0 ? `$${u.total_cost.toFixed(2)}` : "-"}</td>
                  <td className="admin-table-date">
                    {u.last_run_at ? new Date(u.last_run_at).toLocaleDateString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
