import { listReports } from "../lib/reports";

export default async function DashboardPage() {
  const reports = listReports();

  return (
    <section>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Run History</h1>

      {reports.length === 0 ? (
        <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb" }}>
          No runs found. Generate a report by running the CLI. Files are read from the output/ directory at repo root.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "10px 8px" }}>Question</th>
                <th style={{ padding: "10px 8px" }}>Generated</th>
                <th style={{ padding: "10px 8px" }}>Rounds</th>
                <th style={{ padding: "10px 8px" }}>Termination</th>
                <th style={{ padding: "10px 8px" }}>Support</th>
                <th style={{ padding: "10px 8px" }}>Confidence</th>
                <th style={{ padding: "10px 8px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.slug} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 8px", maxWidth: 420 }}>
                    <div style={{ fontWeight: 600 }}>{r.question}</div>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>{r.slug}</div>
                  </td>
                  <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                    {new Date(r.generatedAt).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 8px" }}>{r.roundsCompleted}</td>
                  <td style={{ padding: "10px 8px" }}>{r.terminationReason.replace(/_/g, " ")}</td>
                  <td style={{ padding: "10px 8px" }}>{r.supportLevel || "-"}</td>
                  <td style={{ padding: "10px 8px" }}>
                    {typeof r.confidenceLevel === "number" ? `${r.confidenceLevel.toFixed(1)}/10` : "-"}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <a
                      href={`/runs/${encodeURIComponent(r.slug)}`}
                      style={{
                        padding: "6px 10px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 6,
                        textDecoration: "none",
                        color: "#111827",
                        fontSize: 14
                      }}
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
