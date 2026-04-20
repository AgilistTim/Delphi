import Link from "next/link";
import { Logo } from "../../../../components/Logo";
import { Avatar } from "../../../../components/Avatar";
import { DisclosureBanner } from "../../../../components/DisclosureBanner";
import { Footer } from "../../../../components/Footer";
import { PANEL } from "../../../../lib/fixtures";
import { config } from "../../../../lib/config";

export default function ReportPage({ params }: { params: { id: string } }) {
  return (
    <div className="shell">
      <div className="topbar">
        <div>
          <Logo small />
          <div
            style={{ fontFamily: "'Caveat', cursive", fontSize: 18, fontWeight: 700, marginTop: 2 }}
          >
            Deprecate free tier? · complete
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <span className="pill ok">complete</span>
          <a
            className="btn sm"
            href={`/api/pdf/${params.id}`}
            download={`delphi-${params.id}.pdf`}
          >
            ↓ pdf
          </a>
          <a className="btn sm primary" href={config.calendlyUrl}>
            book tim
          </a>
        </div>
      </div>

      <DisclosureBanner compact />

      {/* Decision Canvas — the hero */}
      <section style={{ marginTop: 20 }}>
        <h2>Decision Canvas</h2>
        <div className="mono" style={{ marginTop: 4 }}>
          consensus · conditional · 7.2/10
        </div>
        <div className="grid-2" style={{ marginTop: 12 }}>
          <div className="box">
            <div className="mono">recommended</div>
            <p style={{ fontSize: 14, marginTop: 4, lineHeight: 1.5 }}>
              Gate free tier behind email verification + usage cap. Ship in six weeks, behind a
              90-day health gate.
            </p>
          </div>
          <div className="box">
            <div className="mono">reversibility</div>
            <p style={{ fontSize: 14, marginTop: 4, lineHeight: 1.5 }}>
              High — ungate in a day if conversion stalls. No data migration required.
            </p>
          </div>
          <div className="box">
            <div className="mono">watch for (90 days)</div>
            <ul style={{ fontSize: 14, marginTop: 4, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>Trial → paid under 2.5%</li>
              <li>Support ticket volume ↑ 15%</li>
              <li>NPS dip in cohort A</li>
            </ul>
          </div>
          <div className="box">
            <div className="mono">the other regime</div>
            <p style={{ fontSize: 14, marginTop: 4, lineHeight: 1.5 }}>
              If category consolidates within 12 months — kill free entirely, consolidate pricing
              around workflow tiers.
            </p>
          </div>
        </div>
      </section>

      {/* Tim CTA — action-first per V2 */}
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

      {/* Panel + dissent */}
      <section style={{ marginTop: 28 }}>
        <h3>The panel</h3>
        <div className="row wrap" style={{ gap: 10, marginTop: 8 }}>
          {PANEL.map((e) => (
            <div
              key={e.name}
              className="row"
              style={{
                gap: 6,
                background: "var(--paper-3)",
                border: "1px solid var(--ink)",
                padding: "4px 10px 4px 4px",
                borderRadius: 16
              }}
            >
              <Avatar name={e.name} size="sm" />
              <span style={{ fontSize: 12 }}>{e.name}</span>
              <span className="mono" style={{ fontSize: 9 }}>
                {e.confidence}/10
              </span>
            </div>
          ))}
        </div>

        <h3 style={{ marginTop: 24 }}>Where they disagreed</h3>
        <div className="grid-2" style={{ marginTop: 8 }}>
          <div className="box ok">
            <div className="mono" style={{ color: "var(--ok)" }}>
              3 for gate
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>JP · AH · KT — preserve the signal.</div>
          </div>
          <div className="box danger">
            <div className="mono" style={{ color: "var(--danger)" }}>
              2 for kill
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              DR · MW — support cost scaling assumption.
            </div>
          </div>
        </div>
        <div className="box dashed" style={{ marginTop: 10, borderColor: "var(--accent)" }}>
          <div className="mono">cross-exam · unresolved</div>
          <p style={{ fontSize: 13, marginTop: 4 }}>
            Whether free-user support cost scales linearly with cohort size, or plateaus after
            onboarding.
          </p>
        </div>
      </section>

      {/* Stress tests */}
      <section style={{ marginTop: 28 }}>
        <h3>Stress tests</h3>
        <div className="stack tight" style={{ marginTop: 8 }}>
          <div className="box dashed">
            <strong>Lossy:</strong> the synthesis averages team size away. A 10-person shop hits
            support costs sooner than this suggests.
          </div>
          <div className="box dashed">
            <strong>Flip:</strong> if trial-to-paid under 2.5% after gate is imposed, the consensus
            reverses to kill.
          </div>
          <div className="box dashed">
            <strong>Other regime:</strong> in an API-first category shift, tiers are the product —
            free-tier decision becomes irrelevant.
          </div>
          <div className="box dashed">
            <strong>Contrarian:</strong> &ldquo;You should keep the free tier wide open and eat the
            support cost for 12 months to capture category share before consolidation.&rdquo;
          </div>
        </div>
      </section>

      {/* 12-month signals */}
      <section style={{ marginTop: 28 }}>
        <h3>12-month signals</h3>
        <div className="stack tight" style={{ marginTop: 8, fontSize: 14 }}>
          <div className="meta-row">
            <span className="k">Trial → paid %</span>
            <span className="v">baseline 3.1% · alert under 2.5%</span>
          </div>
          <div className="meta-row">
            <span className="k">Support ticket ratio</span>
            <span className="v">baseline 1.0× · alert over 1.8×</span>
          </div>
          <div className="meta-row">
            <span className="k">Cohort churn (A)</span>
            <span className="v">baseline 4% · alert over 6%</span>
          </div>
          <div className="meta-row">
            <span className="k">NPS (paid)</span>
            <span className="v">baseline 42 · alert under 35</span>
          </div>
        </div>
      </section>

      <div className="hr dashed" />

      <div className="row between wrap" style={{ gap: 12 }}>
        <Link href="/app" className="mono" style={{ fontSize: 10 }}>
          ← all decisions
        </Link>
        <a className="mono" style={{ fontSize: 10 }} href={`/api/pdf/${params.id}`}>
          ↓ full report (PDF, 18 pages)
        </a>
      </div>

      <Footer />
    </div>
  );
}
