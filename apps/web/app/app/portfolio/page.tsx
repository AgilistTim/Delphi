import Link from "next/link";
import { Logo } from "../../components/Logo";
import { Footer } from "../../components/Footer";
import { listCompletedRuns } from "../../lib/runs";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const runs = await listCompletedRuns();

  const entries = runs.map((r) => {
    const report = r.report || {};
    return {
      id: r.id,
      question: r.question,
      date: r.completed_at || r.started_at,
      confidence: report?.consensus_summary?.confidence_level ?? 0,
      consensusType: report?.convergence_analysis?.consensus_type ?? "unknown",
      rounds: report?.convergence_analysis?.rounds_completed ?? 0,
      experts: report?.expert_positions?.length ?? 0,
      position: report?.consensus_summary?.final_position ?? "",
      cost: r.cost_usd ?? report?.cost_summary?.estimated_total_cost_usd ?? 0,
      tokens: r.total_tokens ?? report?.cost_summary?.total_tokens ?? 0
    };
  });

  const avgConfidence =
    entries.length > 0 ? entries.reduce((s, e) => s + e.confidence, 0) / entries.length : 0;
  const totalCost = entries.reduce((s, e) => s + e.cost, 0);
  const totalTokens = entries.reduce((s, e) => s + e.tokens, 0);

  const consensusCounts: Record<string, number> = {};
  entries.forEach((e) => {
    consensusCounts[e.consensusType] = (consensusCounts[e.consensusType] || 0) + 1;
  });

  return (
    <div className="shell shell-wide">
      <div className="topbar">
        <Logo small />
        <span className="mono">portfolio</span>
      </div>

      <div className="row between" style={{ marginTop: 18 }}>
        <h2>Portfolio</h2>
        <Link href="/app" className="mono" style={{ fontSize: 10 }}>
          ← all decisions
        </Link>
      </div>

      <div className="grid-2" style={{ marginTop: 14 }}>
        <div className="box center" style={{ padding: 14 }}>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 32, fontWeight: 700 }}>
            {entries.length}
          </div>
          <div className="mono" style={{ fontSize: 10 }}>
            total analyses
          </div>
        </div>
        <div className="box center" style={{ padding: 14 }}>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 32, fontWeight: 700 }}>
            {avgConfidence.toFixed(1)}
          </div>
          <div className="mono" style={{ fontSize: 10 }}>
            avg confidence /10
          </div>
        </div>
        <div className="box center" style={{ padding: 14 }}>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 32, fontWeight: 700 }}>
            ${totalCost.toFixed(2)}
          </div>
          <div className="mono" style={{ fontSize: 10 }}>
            total cost · {totalTokens.toLocaleString()} tokens
          </div>
        </div>
        <div className="box" style={{ padding: 14 }}>
          <div className="mono" style={{ fontSize: 10, marginBottom: 6 }}>
            consensus distribution
          </div>
          <div className="row wrap" style={{ gap: 6 }}>
            {Object.entries(consensusCounts).map(([type, count]) => (
              <span key={type} className="pill">
                {type}: {count}
              </span>
            ))}
            {entries.length === 0 && <span className="mono" style={{ fontSize: 10 }}>—</span>}
          </div>
        </div>
      </div>

      <section style={{ marginTop: 24 }}>
        <h3>All analyses</h3>
        {entries.length === 0 ? (
          <div className="box dashed center" style={{ padding: 24, marginTop: 10 }}>
            <p style={{ color: "var(--ink-soft)" }}>No completed analyses yet.</p>
          </div>
        ) : (
          <div className="stack tight" style={{ marginTop: 10 }}>
            {entries.map((e) => (
              <Link
                key={e.id}
                href={`/app/s/${e.id}/report`}
                className="box"
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div className="row between">
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{e.question}</span>
                  <span className="pill">{e.consensusType}</span>
                </div>
                <div className="mono" style={{ fontSize: 10, marginTop: 6 }}>
                  {new Date(e.date).toLocaleDateString()} · confidence {e.confidence.toFixed(1)} ·{" "}
                  {e.rounds} rounds · {e.experts} experts
                </div>
                {e.position && (
                  <p style={{ fontSize: 13, marginTop: 6, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                    {e.position.length > 160 ? e.position.slice(0, 160) + "…" : e.position}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
