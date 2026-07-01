import Link from "next/link";
import { Logo } from "../components/Logo";
import { Avatar } from "../components/Avatar";
import { DisclosureBanner } from "../components/DisclosureBanner";
import { Footer } from "../components/Footer";
import { config } from "../lib/config";
import { getUser } from "../lib/supabase/server";
import { listRuns } from "../lib/runs";
import { hasUserKey } from "../lib/keys";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [user, runs, keySet] = await Promise.all([getUser(), listRuns(), hasUserKey()]);
  const email = user?.email ?? "you@local";

  const usedSessions = runs.length;
  const remaining = Math.max(0, config.perAccountSessions - usedSessions);
  const usedTokens = runs.reduce((sum, r) => sum + (r.total_tokens ?? 0), 0);
  const pct = Math.min(100, Math.round((usedTokens / config.perAccountTokens) * 100));

  return (
    <div className="shell shell-wide">
      <div className="topbar">
        <Logo small />
        <div className="row" style={{ gap: 10 }}>
          <Avatar name={email} size="sm" />
          <span className="mono">{email}</span>
        </div>
      </div>

      <DisclosureBanner compact />

      {!keySet && (
        <div className="box accent" style={{ marginTop: 14, padding: "10px 14px" }}>
          <div className="row between">
            <span style={{ fontSize: 14 }}>
              <strong>Add your Anthropic API key</strong> to run deliberations.
            </span>
            <Link href="/app/settings" className="btn primary sm">
              Add key →
            </Link>
          </div>
        </div>
      )}

      <div className="sidebar-layout" style={{ marginTop: 18 }}>
        <aside className="stack tight">
          <div className="mono">budget</div>
          <div className="box center" style={{ padding: 12 }}>
            <div
              style={{
                fontFamily: "'Caveat', cursive",
                fontSize: 36,
                fontWeight: 700,
                color: "var(--accent)",
                lineHeight: 1
              }}
            >
              {remaining}/{config.perAccountSessions}
            </div>
            <div className="mono" style={{ fontSize: 10, marginTop: 2 }}>
              sessions left
            </div>
          </div>
          <div className="bar">
            <div className="fill" style={{ width: `${100 - pct}%` }} />
          </div>
          <div className="mono" style={{ fontSize: 10 }}>
            {usedTokens.toLocaleString()} of {config.perAccountTokens.toLocaleString()} tokens
          </div>

          <div className="hr dashed" />
          <div className="mono">views</div>
          <Link href="/app/portfolio" className="mono" style={{ fontSize: 10 }}>
            → portfolio
          </Link>
          <Link href="/app/signal-tracker" className="mono" style={{ fontSize: 10 }}>
            → signal tracker
          </Link>
          <Link href="/app/calibration" className="mono" style={{ fontSize: 10 }}>
            → calibration
          </Link>

          <div className="hr dashed" />
          <div className="mono">account</div>
          <Link
            href="/app/settings"
            className="mono"
            style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}
          >
            → settings
            {!keySet && (
              <span className="pill danger" style={{ fontSize: 8, padding: "1px 6px" }}>
                !
              </span>
            )}
          </Link>
          <a className="mono" style={{ fontSize: 10 }} href={config.calendlyUrl}>
            → book a call with Tim
          </a>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="mono"
              style={{
                fontSize: 10,
                background: "transparent",
                border: 0,
                cursor: "pointer",
                color: "var(--ink-soft)",
                padding: 0
              }}
            >
              → sign out
            </button>
          </form>
        </aside>

        <section>
          <div className="row between" style={{ marginBottom: 12 }}>
            <h2>Your decisions</h2>
            <Link href="/app/new" className="btn primary">
              + new decision
            </Link>
          </div>

          <div className="stack">
            {runs.map((s) => {
              const running = s.status === "running" || s.status === "pending";
              const href = running ? `/app/s/${s.id}` : `/app/s/${s.id}/report`;
              return (
                <Link
                  key={s.id}
                  href={href}
                  className={`box ${running ? "dashed" : ""}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    borderColor: running ? "var(--accent)" : undefined
                  }}
                >
                  <div className="row between">
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{s.question}</span>
                    <span
                      className={`pill ${
                        s.status === "completed" ? "ok" : s.status === "error" ? "danger" : "accent"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div className="mono" style={{ fontSize: 10, marginTop: 6 }}>
                    {new Date(s.started_at).toLocaleDateString()} ·{" "}
                    {(s.total_tokens ?? 0).toLocaleString()} tokens
                    {s.verdict ? ` · ${s.verdict}` : ""}
                  </div>
                </Link>
              );
            })}

            {runs.length === 0 && (
              <div className="box dashed center" style={{ padding: 28 }}>
                <h3 style={{ color: "var(--ink-soft)" }}>No decisions yet.</h3>
                <p style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 6 }}>
                  Start your first one — it takes about 6 minutes.
                </p>
                <Link href="/app/new" className="btn primary" style={{ marginTop: 10 }}>
                  + new decision
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
