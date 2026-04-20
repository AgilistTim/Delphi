import Link from "next/link";
import { Logo } from "../../components/Logo";
import { Footer } from "../../components/Footer";
import { DEMO_SESSIONS } from "../../lib/fixtures";
import { config } from "../../lib/config";

export default function CapHitPage() {
  return (
    <div className="shell">
      <div className="topbar">
        <Logo small />
        <span className="pill danger">cap reached</span>
      </div>

      <div className="box accent" style={{ padding: 20 }}>
        <h2>You&rsquo;ve used your {config.perAccountSessions} demo sessions.</h2>
        <p style={{ fontSize: 14, marginTop: 8, lineHeight: 1.55 }}>
          This is the point where Delphi stops being a demo and starts being a consulting
          engagement. If the output&rsquo;s been useful, the next step is a facilitated session with
          Tim — or a local deployment for your team.
        </p>
        <div className="row wrap" style={{ gap: 10, marginTop: 16 }}>
          <a className="btn primary lg" href={config.calendlyUrl}>
            Book a call with Tim →
          </a>
          <a
            className="btn"
            href="mailto:tim@agilist.co.uk?subject=Delphi%20local%20deployment"
          >
            Ask about local deployment
          </a>
        </div>
        <div className="mono" style={{ fontSize: 10, marginTop: 12 }}>
          no sales pitch · diagnostic first
        </div>
      </div>

      <div className="hr dashed" />

      <div className="mono" style={{ marginBottom: 8 }}>
        your {DEMO_SESSIONS.length} sessions · read-only ↓
      </div>
      <div className="stack tight">
        {DEMO_SESSIONS.map((s) => (
          <div key={s.id} className="box row between" style={{ padding: "8px 12px" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{s.title}</div>
              <div className="mono" style={{ fontSize: 10, marginTop: 2 }}>
                {s.createdAt} · {s.tokens.toLocaleString()} tokens
              </div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <Link href={`/app/s/${s.id}/report`} className="btn sm">
                view
              </Link>
              <a className="btn sm" href={`/api/pdf/${s.id}`}>
                ↓ pdf
              </a>
            </div>
          </div>
        ))}
      </div>

      <Footer />
    </div>
  );
}
