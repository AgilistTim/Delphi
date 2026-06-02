import Link from "next/link";
import { Logo } from "../../../../components/Logo";
import { Avatar } from "../../../../components/Avatar";
import { DisclosureBanner } from "../../../../components/DisclosureBanner";
import { Footer } from "../../../../components/Footer";
import { config } from "../../../../lib/config";
import { getRun } from "../../../../lib/engine-proxy";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: { id: string } }) {
  const run = await getRun(params.id);

  if (!run) {
    return (
      <div className="shell">
        <div className="topbar">
          <Logo small />
          <span className="pill danger">not found</span>
        </div>
        <div className="box danger" style={{ padding: 16, marginTop: 20 }}>
          <strong>Session not found.</strong>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            Start a new decision from the dashboard.
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (run.status !== "completed" || !run.report) {
    return (
      <div className="shell">
        <div className="topbar">
          <Logo small />
          <span className="pill accent">still running</span>
        </div>
        <div className="box accent" style={{ padding: 16, marginTop: 20 }}>
          <strong>This session is still running.</strong>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            Head back to the live view — it&rsquo;ll redirect you here when complete.
          </div>
          <Link href={`/app/s/${params.id}`} className="btn sm" style={{ marginTop: 10 }}>
            ← live view
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const report = run.report as any;
  const canvas = report.decision_canvas;
  const consensus = report.consensus_summary;
  const finalSynthesis = report.round_history?.[report.round_history.length - 1];
  const experts = report.expert_personas || [];
  const stressTests = report.contrarian_responses?.[0]?.reasoning_stress_tests;

  const confidence = typeof consensus?.confidence_level === "number"
    ? consensus.confidence_level.toFixed(1)
    : null;

  return (
    <div className="shell">
      <div className="topbar">
        <div>
          <Logo small />
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 18, fontWeight: 700, marginTop: 2 }}>
            {run.question}
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <span className="pill ok">complete</span>
          <a className="btn sm" href={`/api/artifact/${params.id}/md`} target="_blank" rel="noreferrer">
            .md
          </a>
          <a className="btn sm" href={`/api/artifact/${params.id}/json`} target="_blank" rel="noreferrer">
            .json
          </a>
          <a className="btn sm primary" href={config.calendlyUrl}>
            book tim
          </a>
        </div>
      </div>

      <DisclosureBanner compact />

      {/* Decision Canvas hero */}
      <section style={{ marginTop: 20 }}>
        <h2>Decision Canvas</h2>
        {confidence && (
          <div className="mono" style={{ marginTop: 4 }}>
            consensus · confidence {confidence}/10
          </div>
        )}
        {consensus?.final_position && (
          <div className="box accent" style={{ padding: 14, marginTop: 10 }}>
            <div className="mono">the consensus</div>
            <p style={{ fontSize: 15, marginTop: 6, lineHeight: 1.55 }}>{consensus.final_position}</p>
            {consensus.support_level && (
              <div className="mono" style={{ fontSize: 10, marginTop: 6 }}>
                {consensus.support_level}
              </div>
            )}
          </div>
        )}

        {canvas && (
          <div className="grid-2" style={{ marginTop: 12 }}>
            <div className="box">
              <div className="mono">recommended action (consensus regime)</div>
              <p style={{ fontSize: 14, marginTop: 4, lineHeight: 1.5 }}>{canvas.consensus_action}</p>
            </div>
            <div className="box">
              <div className="mono">hedge action (oppositional regime)</div>
              <p style={{ fontSize: 14, marginTop: 4, lineHeight: 1.5 }}>{canvas.oppositional_action}</p>
            </div>
            <div className="box">
              <div className="mono">reversibility</div>
              <p style={{ fontSize: 14, marginTop: 4, lineHeight: 1.5 }}>{canvas.reversibility_assessment}</p>
            </div>
            <div className="box">
              <div className="mono">optionality</div>
              <p style={{ fontSize: 14, marginTop: 4, lineHeight: 1.5 }}>{canvas.optionality_analysis}</p>
            </div>
            <div className="box">
              <div className="mono">time pressure</div>
              <p style={{ fontSize: 14, marginTop: 4, lineHeight: 1.5 }}>{canvas.time_pressure}</p>
            </div>
            <div className="box">
              <div className="mono">monitoring plan</div>
              <ul style={{ fontSize: 14, marginTop: 4, paddingLeft: 18, lineHeight: 1.6 }}>
                {(canvas.monitoring_plan || []).map((item: string, i: number) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* Book Tim CTA */}
      <section style={{ marginTop: 24 }}>
        <div className="box accent row between" style={{ padding: 14, gap: 14 }}>
          <div>
            <div style={{ fontSize: 15 }}>
              <strong>Want Tim to facilitate a full session?</strong>
            </div>
            <div className="mono" style={{ fontSize: 10, marginTop: 4 }}>
              45-min call · £0 · diagnostic first, not a sales pitch
            </div>
          </div>
          <a className="btn primary" href={config.calendlyUrl}>
            book →
          </a>
        </div>
      </section>

      {/* Panel */}
      {experts.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h3>The panel</h3>
          <div className="stack tight" style={{ marginTop: 10 }}>
            {experts.map((p: any, i: number) => (
              <div key={i} className="row top" style={{ gap: 10 }}>
                <Avatar name={p.name || p.role || `E${i + 1}`} />
                <div className="box grow">
                  <div className="row between">
                    <strong style={{ fontSize: 14 }}>{p.name || p.role}</strong>
                    {p.epistemic_stance && (
                      <span className="mono" style={{ fontSize: 9 }}>
                        {String(p.epistemic_stance).replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  {p.role && p.name && (
                    <div className="mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginTop: 2 }}>
                      {p.role}
                    </div>
                  )}
                  {p.description && (
                    <p style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
                      {p.description.length > 300 ? p.description.slice(0, 300) + "…" : p.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Consensus / divergence from final round */}
      {finalSynthesis && (
        <section style={{ marginTop: 28 }}>
          <div className="grid-2">
            {Array.isArray(finalSynthesis.consensus_areas) && finalSynthesis.consensus_areas.length > 0 && (
              <div className="box ok">
                <div className="mono" style={{ color: "var(--ok)" }}>areas of consensus</div>
                <ul style={{ fontSize: 13, marginTop: 6, paddingLeft: 18, lineHeight: 1.55 }}>
                  {finalSynthesis.consensus_areas.map((a: string, i: number) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(finalSynthesis.divergence_areas) && finalSynthesis.divergence_areas.length > 0 && (
              <div className="box danger">
                <div className="mono" style={{ color: "var(--danger)" }}>areas of divergence</div>
                <ul style={{ fontSize: 13, marginTop: 6, paddingLeft: 18, lineHeight: 1.55 }}>
                  {finalSynthesis.divergence_areas.map((a: string, i: number) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Stress tests */}
      {stressTests && (
        <section style={{ marginTop: 28 }}>
          <h3>Stress tests</h3>
          <div className="stack tight" style={{ marginTop: 8 }}>
            <div className="box dashed">
              <strong>Lossy:</strong> {stressTests.lossy_simplification}
            </div>
            <div className="box dashed">
              <strong>Context flip:</strong> {stressTests.context_flip}
            </div>
            <div className="box dashed">
              <strong>Incentives:</strong> {stressTests.incentive_misalignment}
            </div>
            <div className="box dashed">
              <strong>Second-order:</strong> {stressTests.second_order_failure}
            </div>
          </div>
        </section>
      )}

      {/* Key evidence */}
      {Array.isArray(consensus?.key_evidence) && consensus.key_evidence.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h3>Key evidence</h3>
          <div className="stack tight" style={{ marginTop: 8 }}>
            {consensus.key_evidence.slice(0, 8).map((c: any, i: number) => (
              <a
                key={i}
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="box"
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>{c.title}</div>
                {c.relevance && (
                  <div className="mono" style={{ fontSize: 10, marginTop: 4 }}>
                    {c.relevance}
                  </div>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="hr dashed" />

      <div className="row between wrap" style={{ gap: 12 }}>
        <Link href="/app" className="mono" style={{ fontSize: 10 }}>
          ← all decisions
        </Link>
        <span className="mono" style={{ fontSize: 10 }}>
          run {params.id} · started {new Date(run.started_at).toLocaleString()}
          {run.completed_at ? ` · done in ${Math.round((run.completed_at - run.started_at) / 1000)}s` : ""}
        </span>
      </div>

      <Footer />
    </div>
  );
}
