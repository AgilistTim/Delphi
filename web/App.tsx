export default function App() {
  return (
    <div className="shell shell-wide">
      <div className="topbar">
        <div className="logo">delphi</div>
        <div className="row" style={{ gap: 18 }}>
          <a className="mono" href="#method">Method</a>
          <a className="mono" href="#sample">Sample</a>
          <a href="/request" className="btn primary sm">Request access</a>
        </div>
      </div>

      <section className="hero-grid">
        <div className="stack">
          <h1>
            Decisions, <em>with receipts.</em>
          </h1>
          <p className="subtitle">
            A structured panel of AI experts debates your decision over multiple rounds. You get the
            consensus, the dissent, and the assumptions that would have to fail for it to be wrong.
          </p>
          <div className="row" style={{ gap: 10 }}>
            <a href="/request" className="btn primary lg">Request access &rarr;</a>
            <span className="mono" style={{ fontSize: 10 }}>
              ~24h turnaround &middot; no subscription
            </span>
          </div>

          <div className="hr dashed" />

          <div className="mono">Seen via</div>
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="pill">TAFG network</span>
            <span className="pill">LinkedIn</span>
            <span className="pill">Agilist clients</span>
          </div>

          <div className="hr dashed" />

          <div>
            <div className="mono">Who it&apos;s for</div>
            <p style={{ fontSize: 14, marginTop: 6, color: "var(--ink-soft)" }}>
              Strategy, policy, and risk leads in teams of 20&ndash;500. Decisions too big for a meeting,
              too small for a board paper.
            </p>
          </div>
        </div>

        <aside className="box sample-box" id="sample">
          <div className="mono" style={{ fontSize: 10, marginBottom: 8 }}>
            sample &middot; &ldquo;Should we migrate off Kafka?&rdquo;
          </div>

          <div className="box accent" style={{ padding: 10 }}>
            <div className="mono" style={{ fontSize: 9 }}>consensus &middot; conditional &middot; 7.2/10</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>
              <strong>Migrate only if ops cost exceeds 40% of eng time.</strong> Reversible sub-projects
              first; full cutover behind a 60-day health gate.
            </div>
          </div>

          <div className="row wrap" style={{ gap: 4, marginTop: 10 }}>
            {["Dr R", "JP", "MW", "AH", "KT"].map((n) => (
              <div key={n} className="avatar sm">{n[0]}</div>
            ))}
            <span className="mono" style={{ fontSize: 10, marginLeft: 4 }}>panel of 5</span>
          </div>

          <div className="mono" style={{ fontSize: 10, marginTop: 14 }}>stress tests &darr;</div>
          <div className="stack tight" style={{ marginTop: 4 }}>
            <div className="box dashed" style={{ fontSize: 12, padding: "6px 8px" }}>
              <strong>Lossy:</strong> averages away team-size nuance.
            </div>
            <div className="box dashed" style={{ fontSize: 12, padding: "6px 8px" }}>
              <strong>Flip:</strong> reverses if team &lt;8 engineers.
            </div>
            <div className="box dashed" style={{ fontSize: 12, padding: "6px 8px" }}>
              <strong>Other regime:</strong> if throughput needs change, RabbitMQ is a ceiling.
            </div>
          </div>

          <div className="hr dashed" />
          <div className="row between">
            <span className="mono" style={{ fontSize: 10 }}>18-page PDF &middot; includes transcript</span>
            <span className="scribble">&uarr; the output IS the pitch</span>
          </div>
        </aside>
      </section>

      <section id="method" style={{ marginTop: 56 }}>
        <div className="mono">The method</div>
        <h2 style={{ marginTop: 6 }}>Four phases per round, two to five rounds.</h2>
        <div className="grid-3" style={{ marginTop: 16 }}>
          <div className="box">
            <div className="mono">1 &middot; panel</div>
            <p style={{ fontSize: 14, marginTop: 4 }}>
              Five AI experts with distinct, opinionated stances &mdash; not one voice averaging.
            </p>
          </div>
          <div className="box">
            <div className="mono">2 &middot; rounds</div>
            <p style={{ fontSize: 14, marginTop: 4 }}>
              They research, respond, and revise. Two to five rounds until consensus or reasoned divergence.
            </p>
          </div>
          <div className="box">
            <div className="mono">3 &middot; stress tests</div>
            <p style={{ fontSize: 14, marginTop: 4 }}>
              Four structured challenges: lossy, flip, other-regime, contrarian.
            </p>
          </div>
          <div className="box">
            <div className="mono">4 &middot; canvas</div>
            <p style={{ fontSize: 14, marginTop: 4 }}>
              Consensus + dissent + 12-month signals + monitoring plan. PDF, downloadable.
            </p>
          </div>
          <div className="box filled">
            <div className="mono">built for</div>
            <p style={{ fontSize: 14, marginTop: 4 }}>
              Reversible-once decisions: pricing, hiring freezes, platform migrations, product sunsets,
              market entries.
            </p>
          </div>
          <div className="box filled">
            <div className="mono">limits</div>
            <p style={{ fontSize: 14, marginTop: 4 }}>
              3 decisions per account on the demo. After that: a conversation with Tim.
            </p>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 56 }}>
        <div className="box accent center" style={{ padding: 24 }}>
          <h2>A sparring partner for hard, reversible-once decisions.</h2>
          <p style={{ fontSize: 14, marginTop: 8, maxWidth: 520, margin: "8px auto 16px", color: "var(--ink-soft)" }}>
            Used inside Agilist engagements with leadership teams. Now available as a gated demo.
          </p>
          <a href="/request" className="btn primary lg">Request access &rarr;</a>
          <div className="mono" style={{ fontSize: 10, marginTop: 10 }}>
            tim reads every request &middot; reply within a day
          </div>
        </div>
      </section>

      <footer className="footer">
        <span className="mono">&copy; Agilist</span>
        <span className="mono">Delphi v1</span>
      </footer>
    </div>
  );
}
