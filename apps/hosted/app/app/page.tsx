import Link from "next/link";
import { Logo } from "../components/Logo";
import { Avatar } from "../components/Avatar";
import { DisclosureBanner } from "../components/DisclosureBanner";
import { Footer } from "../components/Footer";
import { DEMO_SESSIONS } from "../lib/fixtures";
import { config } from "../lib/config";

// Stubbed user — in production this comes from Supabase auth
const USER = { name: "Sarah Adewale", email: "sarah@acme.co" };
const USED_SESSIONS = 1;
const USED_TOKENS = 47000;

export default function DashboardPage() {
  const remaining = config.perAccountSessions - USED_SESSIONS;
  const pct = Math.min(100, Math.round((USED_TOKENS / config.perAccountTokens) * 100));
  return (
    <div className="shell shell-wide">
      <div className="topbar">
        <Logo small />
        <div className="row" style={{ gap: 10 }}>
          <Avatar name={USER.name} size="sm" />
          <span className="mono">{USER.email}</span>
        </div>
      </div>

      <DisclosureBanner compact />

      <div className="sidebar-layout" style={{ marginTop: 18 }}>
        {/* Sidebar: budget */}
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
            {USED_TOKENS.toLocaleString()} of {config.perAccountTokens.toLocaleString()} tokens
          </div>

          <div className="hr dashed" />
          <div className="mono">help</div>
          <a href="#method" className="mono" style={{ fontSize: 10 }}>
            → how it works
          </a>
          <a
            className="mono"
            style={{ fontSize: 10 }}
            href={config.calendlyUrl}
          >
            → book a call with Tim
          </a>
        </aside>

        {/* Main: sessions list */}
        <section>
          <div className="row between" style={{ marginBottom: 12 }}>
            <h2>Your decisions</h2>
            <Link href="/app/new" className="btn primary">
              + new decision
            </Link>
          </div>

          <div className="stack">
            {DEMO_SESSIONS.map((s) => (
              <Link
                key={s.id}
                href={`/app/s/${s.id}/report`}
                className={`box ${s.status === "running" ? "dashed" : ""}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  borderColor: s.status === "running" ? "var(--accent)" : undefined
                }}
              >
                <div className="row between">
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{s.title}</span>
                  <span className={`pill ${s.status === "complete" ? "ok" : "accent"}`}>
                    {s.status}
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 10, marginTop: 6 }}>
                  {s.createdAt} · {s.tokens.toLocaleString()} tokens
                  {s.verdict ? ` · ${s.verdict}` : ""}
                  {s.pdfReady ? " · pdf ↓" : ""}
                </div>
              </Link>
            ))}

            {DEMO_SESSIONS.length === 0 && (
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
