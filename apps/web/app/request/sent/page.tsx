import { Logo } from "../../components/Logo";
import { Footer } from "../../components/Footer";
import { Avatar } from "../../components/Avatar";
import Link from "next/link";

export default function RequestSentPage() {
  return (
    <div className="shell">
      <div className="topbar">
        <Logo small />
        <span className="pill ok">✓ sent</span>
      </div>

      <div className="box accent" style={{ padding: 18 }}>
        <h2>Expect a reply within a day.</h2>
        <p style={{ fontSize: 14, marginTop: 6 }}>
          We&rsquo;ll send a magic-link. No password, no account — just approved email.
        </p>
        <div className="row" style={{ gap: 10, marginTop: 12, alignItems: "center" }}>
          <Avatar name="Tim" size="lg" />
          <div style={{ fontSize: 13 }}>
            <div style={{ fontFamily: "'Caveat', cursive", fontSize: 20, fontWeight: 700 }}>
              — Tim
            </div>
            <div className="mono" style={{ fontSize: 10 }}>
              tim@agilist.co.uk · agilist.co.uk
            </div>
          </div>
        </div>
      </div>

      <div className="mono" style={{ marginTop: 28 }}>
        While you wait — the method ↓
      </div>
      <div className="grid-2" style={{ marginTop: 10 }}>
        <div className="box">
          <div className="mono">1 · panel</div>
          <p style={{ fontSize: 14, marginTop: 4 }}>5 AI experts with distinct stances.</p>
        </div>
        <div className="box">
          <div className="mono">2 · rounds</div>
          <p style={{ fontSize: 14, marginTop: 4 }}>They research, respond, revise — 2–5 times.</p>
        </div>
        <div className="box">
          <div className="mono">3 · stress tests</div>
          <p style={{ fontSize: 14, marginTop: 4 }}>Four structured challenges to the synthesis.</p>
        </div>
        <div className="box">
          <div className="mono">4 · canvas</div>
          <p style={{ fontSize: 14, marginTop: 4 }}>
            Consensus + regime signals + monitoring plan.
          </p>
        </div>
      </div>

      <div className="hr dashed" />

      <div className="row between wrap" style={{ gap: 12 }}>
        <div className="mono" style={{ fontSize: 10 }}>
          Check your inbox filter · from <strong>tim@agilist.co.uk</strong>
        </div>
        <div className="row" style={{ gap: 14 }}>
          <Link href="/" className="mono" style={{ fontSize: 10 }}>
            ← back to landing
          </Link>
          <a className="mono" style={{ fontSize: 10 }} href="https://agilist.co.uk/writing">
            → Tim&rsquo;s writing
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
