import { ADMIN_QUEUE } from "../../lib/fixtures";

export default function AdminQueuePage() {
  const stale = ADMIN_QUEUE.filter((r) => r.stale).length;
  return (
    <section style={{ marginTop: 12 }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 22, fontWeight: 700 }}>
          Pending requests
        </div>
        <div className="mono">
          {ADMIN_QUEUE.length} pending · {stale} waiting &gt; 24h
        </div>
      </div>

      <div className="stack">
        {ADMIN_QUEUE.map((r) => (
          <div
            key={r.id}
            className="box"
            style={{
              padding: 14,
              borderColor: r.stale ? "var(--danger)" : "var(--admin-rule)"
            }}
          >
            <div className="row between">
              <div style={{ fontSize: 15 }}>
                <strong>{r.name}</strong> · {r.company} ·{" "}
                <span className="mono" style={{ fontSize: 10 }}>
                  {r.role}
                </span>
              </div>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  color: r.stale ? "var(--danger)" : "var(--ink-faint)"
                }}
              >
                {r.ageHours < 24 ? `${r.ageHours}h` : `${Math.round(r.ageHours / 24)}d`}
              </span>
            </div>
            <div className="italic" style={{ fontSize: 13, marginTop: 6, color: "var(--accent-soft)" }}>
              &ldquo;{r.context}&rdquo;
            </div>
            <div className="row" style={{ gap: 6, marginTop: 10 }}>
              <button className="btn sm primary">approve + send link</button>
              <button className="btn sm">reject</button>
              <button className="btn sm ghost">reply manually</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
