import Link from "next/link";
import { Logo } from "../../components/Logo";
import { Footer } from "../../components/Footer";
import { getRetrospectives } from "../../lib/runs";

export const dynamic = "force-dynamic";

const OUTCOME_PILL: Record<string, string> = {
  correct: "ok",
  partially_correct: "accent",
  incorrect: "danger",
  too_early: ""
};

export default async function CalibrationPage() {
  const retros = await getRetrospectives();
  const evaluated = retros.filter((r) => r.outcome !== "too_early");
  const total = evaluated.length;
  const correct = evaluated.filter((r) => r.outcome === "correct").length;
  const partial = evaluated.filter((r) => r.outcome === "partially_correct").length;
  const incorrect = evaluated.filter((r) => r.outcome === "incorrect").length;
  const tooEarly = retros.filter((r) => r.outcome === "too_early").length;
  const accuracy = total > 0 ? ((correct + partial * 0.5) / total) * 100 : 0;

  return (
    <div className="shell shell-wide">
      <div className="topbar">
        <Logo small />
        <span className="mono">calibration</span>
      </div>

      <div className="row between" style={{ marginTop: 18 }}>
        <h2>Calibration</h2>
        <Link href="/app" className="mono" style={{ fontSize: 10 }}>
          ← all decisions
        </Link>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>
        How past consensus positions held up against reality.
      </p>

      <div className="grid-2" style={{ marginTop: 14 }}>
        <div className="box center" style={{ padding: 14 }}>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 32, fontWeight: 700 }}>
            {retros.length}
          </div>
          <div className="mono" style={{ fontSize: 10 }}>
            retrospectives
          </div>
        </div>
        <div className="box center" style={{ padding: 14 }}>
          <div
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: 32,
              fontWeight: 700,
              color: "var(--accent)"
            }}
          >
            {accuracy.toFixed(0)}%
          </div>
          <div className="mono" style={{ fontSize: 10 }}>
            accuracy rate ({total} evaluated)
          </div>
        </div>
      </div>

      <div className="row wrap" style={{ gap: 6, marginTop: 12 }}>
        <span className="pill ok">correct: {correct}</span>
        <span className="pill accent">partial: {partial}</span>
        <span className="pill danger">incorrect: {incorrect}</span>
        <span className="pill">too early: {tooEarly}</span>
      </div>

      <section style={{ marginTop: 24 }}>
        <h3>Retrospectives</h3>
        {retros.length === 0 ? (
          <div className="box dashed center" style={{ padding: 24, marginTop: 10 }}>
            <p style={{ color: "var(--ink-soft)" }}>No retrospectives yet.</p>
            <p className="mono" style={{ fontSize: 10, marginTop: 6 }}>
              Add evaluations via the CLI: <code>npx tsx src/main.ts --retrospective &lt;slug&gt;</code>
            </p>
          </div>
        ) : (
          <div className="stack tight" style={{ marginTop: 10 }}>
            {retros.map((r, i) => (
              <div key={i} className="box">
                <div className="row between">
                  <strong style={{ fontSize: 13 }}>{r.report_slug}</strong>
                  <span className={`pill ${OUTCOME_PILL[r.outcome] ?? ""}`}>
                    {String(r.outcome).replace(/_/g, " ")}
                  </span>
                </div>
                {r.notes && (
                  <p style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>{r.notes}</p>
                )}
                {Array.isArray(r.lessons_learned) && r.lessons_learned.length > 0 && (
                  <ul style={{ fontSize: 12, marginTop: 6, paddingLeft: 18, lineHeight: 1.5 }}>
                    {r.lessons_learned.map((l: string, j: number) => (
                      <li key={j}>{l}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
