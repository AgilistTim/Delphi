import { ADMIN_METRICS } from "../../lib/fixtures";

export default function AdminUsagePage() {
  return (
    <section style={{ marginTop: 12 }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 22, fontWeight: 700 }}>
          Usage · last 30 days
        </div>
        <span className="mono" style={{ color: "var(--accent-soft)" }}>
          £18.40 spent
        </span>
      </div>

      <div className="grid-3">
        {ADMIN_METRICS.map((m) => (
          <div key={m.key} className="box center" style={{ padding: 14 }}>
            <div className="mono">{m.key}</div>
            <div
              style={{
                fontFamily: "'Caveat', cursive",
                fontSize: 36,
                fontWeight: 700,
                color: "var(--accent)",
                lineHeight: 1,
                marginTop: 4
              }}
            >
              {m.value}
            </div>
            <div className="mono" style={{ fontSize: 9, marginTop: 2 }}>
              {m.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="mono" style={{ marginTop: 20 }}>
        cost trend · £/day
      </div>
      <div
        className="box"
        style={{
          marginTop: 8,
          height: 90,
          display: "flex",
          alignItems: "flex-end",
          gap: 4,
          padding: "12px 14px"
        }}
      >
        {[12, 22, 8, 14, 44, 18, 6, 32, 24, 50, 30, 16, 22, 38].map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h}%`,
              background: h > 55 ? "var(--danger)" : "var(--accent)",
              borderRadius: 1
            }}
          />
        ))}
      </div>
      <div className="mono" style={{ fontSize: 10, marginTop: 6 }}>
        £5 alert threshold · red bars exceed
      </div>

      <div className="mono" style={{ marginTop: 24 }}>
        kill-criteria tracking
      </div>
      <div className="stack tight" style={{ marginTop: 8 }}>
        <div className="box row" style={{ padding: "8px 12px", gap: 10 }}>
          <span className="pill ok">ok</span>
          <span style={{ fontSize: 13 }}>≥5 requests / 2 weeks (24 observed)</span>
        </div>
        <div className="box row" style={{ padding: "8px 12px", gap: 10 }}>
          <span className="pill ok">ok</span>
          <span style={{ fontSize: 13 }}>approve → first session &gt; 30% (76%)</span>
        </div>
        <div className="box row" style={{ padding: "8px 12px", gap: 10 }}>
          <span className="pill">watch</span>
          <span style={{ fontSize: 13 }}>
            bookings after 10 completed sessions (4 after 31 — healthy)
          </span>
        </div>
      </div>
    </section>
  );
}
