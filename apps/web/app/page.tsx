import Link from "next/link";
import { Logo } from "./components/Logo";
import { Avatar } from "./components/Avatar";
import { Footer } from "./components/Footer";

export default function LandingPage() {
  return (
    <div className="shell shell-wide">
      <div className="topbar">
        <Logo />
        <div className="row" style={{ gap: 18 }}>
          <a className="mono" href="#method">
            Method
          </a>
          <a className="mono" href="#sample">
            Sample
          </a>
          <Link href="/request" className="btn primary sm">
            Request access
          </Link>
        </div>
      </div>

      {/* Hero — output IS the pitch */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 1.15fr)",
          gap: 32,
          alignItems: "start"
        }}
      >
        <div className="stack">
          <h1>
            Decisions, <em style={{ color: "var(--accent)", fontStyle: "normal" }}>with receipts.</em>
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.55 }}>
            A structured panel of AI experts debates your decision over multiple rounds. You get the
            consensus, the dissent, and the assumptions that would have to fail for it to be wrong.
          </p>
          <div className="row" style={{ gap: 10 }}>
            <Link href="/request" className="btn primary lg">
              Request access →
            </Link>
            <span className="mono" style={{ fontSize: 10 }}>
              ~24h turnaround · no subscription
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
            <div className="mono">Who it's for</div>
            <p style={{ fontSize: 14, marginTop: 6, color: "var(--ink-soft)" }}>
              Strategy, policy, and risk leads in teams of 20–500. Decisions too big for a meeting,
              too small for a board paper.
            </p>
          </div>
        </div>

        {/* Right: canned sample */}
        <aside className="box" id="sample" style={{ background: "var(--paper-2)", padding: 16 }}>
          <div className="mono" style={{ fontSize: 10, marginBottom: 8 }}>
            sample · &ldquo;Should we migrate off Kafka?&rdquo;
          </div>

          <div className="box accent" style={{ padding: 10 }}>
            <div className="mono" style={{ fontSize: 9 }}>
              consensus · conditional · 7.2/10
            </div>
            <div style={{ fontSize: 14, marginTop: 4 }}>
              <strong>Migrate only if ops cost exceeds 40% of eng time.</strong> Reversible
              sub-projects first; full cutover behind a 60-day health gate.
            </div>
          </div>

          <div className="row wrap" style={{ gap: 4, marginTop: 10 }}>
            {["Dr R", "JP", "MW", "AH", "KT"].map((n) => (
              <Avatar key={n} name={n} size="sm" />
            ))}
            <span className="mono" style={{ fontSize: 10, marginLeft: 4 }}>
              panel of 5
            </span>
          </div>

          <div className="mono" style={{ fontSize: 10, marginTop: 14 }}>
            stress tests ↓
          </div>
          <div className="stack tight" style={{ marginTop: 4 }}>
            <div className="box dashed" style={{ fontSize: 12, padding: "6px 8px" }}>
              <strong>Lossy:</strong> averages away team-size nuance.
            </div>
            <div className="box dashed" style={{ fontSize: 12, padding: "6px 8px" }}>
              <strong>Flip:</strong> reverses if team {"<"} 8 engineers.
            </div>
            <div className="box dashed" style={{ fontSize: 12, padding: "6px 8px" }}>
              <strong>Other regime:</strong> if throughput needs change, RabbitMQ is a ceiling.
            </div>
          </div>

          <div className="hr dashed" />
          <div className="row between">
            <span className="mono" style={{ fontSize: 10 }}>
              18-page PDF · includes transcript
            </span>
            <span className="scribble">↑ the output IS the pitch</span>
          </div>
        </aside>
      </section>

      {/* Method strip */}
      <section id="method" style={{ marginTop: 56 }}>
        <div className="mono">The method</div>
        <h2 style={{ marginTop: 6 }}>Four phases per round, two to five rounds.</h2>
        <div className="grid-3" style={{ marginTop: 16 }}>
          <div className="box">
            <div className="mono">1 · panel</div>
            <p style={{ fontSize: 14, marginTop: 4 }}>
              Five AI experts with distinct, opinionated stances — not one voice averaging.
            </p>
          </div>
          <div className="box">
            <div className="mono">2 · rounds</div>
            <p style={{ fontSize: 14, marginTop: 4 }}>
              They research, respond, and revise. Two to five rounds until consensus or reasoned
              divergence.
            </p>
          </div>
          <div className="box">
            <div className="mono">3 · stress tests</div>
            <p style={{ fontSize: 14, marginTop: 4 }}>
              Four structured challenges: lossy, flip, other-regime, contrarian.
            </p>
          </div>
          <div className="box">
            <div className="mono">4 · canvas</div>
            <p style={{ fontSize: 14, marginTop: 4 }}>
              Consensus + dissent + 12-month signals + monitoring plan. PDF, downloadable.
            </p>
          </div>
          <div className="box filled">
            <div className="mono">built for</div>
            <p style={{ fontSize: 14, marginTop: 4 }}>
              Reversible-once decisions: pricing, hiring freezes, platform migrations, product
              sunsets, market entries.
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

      {/* CTA strip */}
      <section style={{ marginTop: 56 }}>
        <div className="box accent center" style={{ padding: 24 }}>
          <h2>A sparring partner for hard, reversible-once decisions.</h2>
          <p
            style={{
              fontSize: 14,
              marginTop: 8,
              maxWidth: 520,
              margin: "8px auto 16px",
              color: "var(--ink-soft)"
            }}
          >
            Used inside Agilist engagements with leadership teams. Now available as a gated demo.
          </p>
          <Link href="/request" className="btn primary lg">
            Request access →
          </Link>
          <div className="mono" style={{ fontSize: 10, marginTop: 10 }}>
            tim reads every request · reply within a day
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
