import Link from "next/link";
import { Logo } from "../../components/Logo";
import { Footer } from "../../components/Footer";
import { getSignalTrackers } from "../../lib/runs";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<string, string> = {
  confirmed: "ok",
  emerging: "accent",
  contradicted: "danger",
  not_observed: ""
};

function SignalList({ title, signals }: { title: string; signals: any[] }) {
  if (!signals?.length) return null;
  return (
    <div className="box" style={{ marginTop: 10 }}>
      <div className="mono" style={{ fontSize: 10 }}>
        {title}
      </div>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }} className="stack tight">
        {signals.map((s, i) => (
          <li key={i} className="row between" style={{ gap: 10 }}>
            <span style={{ fontSize: 13, lineHeight: 1.4 }}>{s.signal}</span>
            <span className={`pill ${STATUS_PILL[s.status] ?? ""}`}>
              {String(s.status).replace(/_/g, " ")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function SignalTrackerPage() {
  const trackers = await getSignalTrackers();

  return (
    <div className="shell shell-wide">
      <div className="topbar">
        <Logo small />
        <span className="mono">signal tracker</span>
      </div>

      <div className="row between" style={{ marginTop: 18 }}>
        <h2>Signal Tracker</h2>
        <Link href="/app" className="mono" style={{ fontSize: 10 }}>
          ← all decisions
        </Link>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>
        Observable 12-month indicators that reveal which regime is emerging.
      </p>

      {trackers.length === 0 ? (
        <div className="box dashed center" style={{ padding: 24, marginTop: 16 }}>
          <p style={{ color: "var(--ink-soft)" }}>No tracked signals yet.</p>
          <p className="mono" style={{ fontSize: 10, marginTop: 6 }}>
            Signals are captured automatically when a deliberation completes.
          </p>
        </div>
      ) : (
        <div className="stack" style={{ marginTop: 16 }}>
          {trackers.map((t, i) => (
            <div key={i} className="box" style={{ padding: 14 }}>
              <div className="row between">
                <strong style={{ fontSize: 14 }}>{t.report_slug}</strong>
                <span className="mono" style={{ fontSize: 10 }}>
                  reviewed {t.last_reviewed ? new Date(t.last_reviewed).toLocaleDateString() : "—"}
                </span>
              </div>
              <SignalList title="consensus regime signals" signals={t.consensus_signals} />
              <SignalList title="oppositional regime signals" signals={t.oppositional_signals} />
            </div>
          ))}
        </div>
      )}

      <Footer />
    </div>
  );
}
