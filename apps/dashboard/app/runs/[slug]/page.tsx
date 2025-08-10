import { readReport } from "../../../lib/reports";

interface RunPageProps {
  params: { slug: string };
}

export default function RunPage({ params }: RunPageProps) {
  const report = readReport(params.slug);

  if (!report) {
    return (
      <section>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Run not found</h1>
        <p style={{ color: "#6b7280" }}>
          Could not find a report for slug "{params.slug}". Ensure a JSON report exists in the output/ directory at repo root.
        </p>
      </section>
    );
  }

  const genAt = typeof report.generated_at === "string"
    ? report.generated_at
    : new Date(report.generated_at as any).toISOString();

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <a href="/" style={{ textDecoration: "none", fontSize: 14, color: "#2563eb" }}>← Back</a>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Run Detail</h1>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <a
          href={`/runs/${encodeURIComponent(params.slug)}/markdown`}
          style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, textDecoration: "none", color: "#111827", fontSize: 14 }}
        >
          View Markdown
        </a>
        <a
          href={`/api/artifacts/${encodeURIComponent(params.slug)}/md`}
          style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, textDecoration: "none", color: "#111827", fontSize: 14 }}
        >
          Download .md
        </a>
        <a
          href={`/api/artifacts/${encodeURIComponent(params.slug)}/json`}
          style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, textDecoration: "none", color: "#111827", fontSize: 14 }}
        >
          Download .json
        </a>
      </div>

      <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 16 }}>
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontWeight: 600 }}>Question:</span> {report.prompt?.question || "—"}
        </div>
        {report.prompt?.context ? (
          <div style={{ color: "#6b7280", fontSize: 14, whiteSpace: "pre-wrap" }}>{report.prompt.context}</div>
        ) : null}
        <div style={{ marginTop: 8, color: "#6b7280", fontSize: 12 }}>
          Generated: {new Date(genAt).toLocaleString()}
        </div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Consensus Summary</h2>
      <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 16 }}>
        <div><strong>Final Position:</strong> {report.consensus_summary?.final_position || "—"}</div>
        <div><strong>Support:</strong> {report.consensus_summary?.support_level || "—"}</div>
        <div><strong>Confidence:</strong> {typeof report.consensus_summary?.confidence_level === "number" ? report.consensus_summary.confidence_level.toFixed(1) + "/10" : "—"}</div>
        {Array.isArray(report.consensus_summary?.key_evidence) && report.consensus_summary.key_evidence.length > 0 ? (
          <div style={{ marginTop: 8 }}>
            <strong>Key Evidence</strong>
            <ul>
              {report.consensus_summary.key_evidence.map((src, idx) => (
                <li key={idx}>
                  <a href={src.url} target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "none" }}>
                    {src.title || src.url}
                  </a>
                  {src.relevance ? <span style={{ color: "#6b7280" }}> — {src.relevance}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Convergence</h2>
      <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 16 }}>
        <div>Rounds Completed: {report.convergence_analysis?.rounds_completed ?? "—"}</div>
        <div>Position Stability: {typeof report.convergence_analysis?.position_stability === "number" ? (report.convergence_analysis.position_stability * 100).toFixed(1) + "%" : "—"}</div>
        <div>Consensus Clarity: {typeof report.convergence_analysis?.consensus_clarity === "number" ? (report.convergence_analysis.consensus_clarity * 100).toFixed(1) + "%" : "—"}</div>
        <div>Confidence Spread: {typeof report.convergence_analysis?.confidence_spread === "number" ? report.convergence_analysis.confidence_spread.toFixed(2) : "—"}</div>
        <div>Citation Overlap: {typeof report.convergence_analysis?.citation_overlap === "number" ? (report.convergence_analysis.citation_overlap * 100).toFixed(1) + "%" : "—"}</div>
        <div>Termination Reason: {report.convergence_analysis?.termination_reason?.toString().replace(/_/g, " ") || "—"}</div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Expert Positions</h2>
      {Array.isArray(report.expert_positions) && report.expert_positions.length > 0 ? (
        <div style={{ display: "grid", gap: 12 }}>
          {report.expert_positions.map((ex, i) => (
            <div key={i} style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                Expert {i + 1}{ex.expertise_area ? ` — ${ex.expertise_area}` : ""}
              </div>
              <div style={{ marginBottom: 6 }}><strong>Position:</strong> {ex.position}</div>
              <div style={{ marginBottom: 6 }}><strong>Confidence:</strong> {ex.confidence}/10</div>
              <div style={{ marginBottom: 6, whiteSpace: "pre-wrap" }}><strong>Reasoning:</strong> {ex.reasoning}</div>
              {Array.isArray(ex.sources) && ex.sources.length > 0 ? (
                <div>
                  <strong>Sources</strong>
                  <ul>
                    {ex.sources.map((s, idx) => (
                      <li key={idx}>
                        <a href={s.url} target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "none" }}>
                          {s.title || s.url}
                        </a>
                        {s.relevance ? <span style={{ color: "#6b7280" }}> — {s.relevance}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: "#6b7280" }}>No expert positions recorded.</div>
      )}

      {Array.isArray(report.contrarian_observations) && report.contrarian_observations.length > 0 ? (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "16px 0 8px" }}>Contrarian Observations</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {report.contrarian_observations.map((c, i) => (
              <div key={i} style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 }}>
                <div style={{ marginBottom: 6 }}><strong>Critique:</strong> {c.critique}</div>
                <div style={{ marginBottom: 6 }}><strong>Alternative Framework:</strong> {c.alternative_framework}</div>
                {Array.isArray(c.blind_spots) && c.blind_spots.length > 0 ? (
                  <div>
                    <strong>Blind Spots</strong>
                    <ul>
                      {c.blind_spots.map((b, idx) => <li key={idx}>{b}</li>)}
                    </ul>
                  </div>
                ) : null}
                {Array.isArray(c.counter_evidence) && c.counter_evidence.length > 0 ? (
                  <div style={{ marginTop: 6 }}>
                    <strong>Counter-Evidence</strong>
                    <ul>
                      {c.counter_evidence.map((e, idx) => (
                        <li key={idx}>
                          <a href={e.url} target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "none" }}>
                            {e.title}
                          </a>
                          {": "} {e.summary}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
