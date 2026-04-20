export default function AdminSessionInspector({ params }: { params: { id: string } }) {
  return (
    <section style={{ marginTop: 12 }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 20, fontWeight: 700 }}>
            sarah@acme · free tier
          </div>
          <div className="mono" style={{ fontSize: 10 }}>
            session {params.id} · 47k tokens · 11 Apr
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <span className="pill ok">complete</span>
          <span className="pill">conditional</span>
        </div>
      </div>

      <div className="grid-2">
        <div className="box">
          <div className="mono">what they asked</div>
          <p style={{ fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>
            Deprecate free tier? B2B SaaS, 40 eng, board margin push by Q3. No layoffs allowed.
          </p>
        </div>
        <div className="box">
          <div className="mono">what panel landed on</div>
          <p style={{ fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>
            Gate, don&rsquo;t kill. Reversibility high. Watch support ratio, cohort churn, NPS.
          </p>
        </div>
      </div>

      <div className="box" style={{ marginTop: 14, borderColor: "var(--accent)" }}>
        <div className="mono">⸻ tim&rsquo;s notes (private)</div>
        <textarea
          className="textarea"
          defaultValue="Board pressure angle is the real story here. Lead with that in the call — offer to re-run with CFO-framing. Marcus at LoomCo is adjacent — possible intro."
          style={{ marginTop: 8, minHeight: 80 }}
        />
      </div>

      <div className="row between" style={{ marginTop: 14 }}>
        <div className="row" style={{ gap: 6 }}>
          <a className="btn sm" href={`/api/pdf/${params.id}`}>
            ↓ pdf
          </a>
          <a className="btn sm" href={`/app/s/${params.id}/report`}>
            view full report
          </a>
        </div>
        <button className="btn sm primary">draft follow-up email</button>
      </div>

      <div className="hr dashed" />

      <div className="mono">transcript · all 3 rounds</div>
      <div className="console" style={{ marginTop: 8 }}>
        <div>
          <span className="ts">[09:42:11]</span> Dr Renu submitting round 1 response…
        </div>
        <div>
          <span className="ts">[09:42:17]</span> JP Klein citing 4 sources
        </div>
        <div>
          <span className="ts">[09:42:19]</span> <span className="hot">cross-examine · DR ↔ JP</span>
        </div>
        <div>
          <span className="ts">[09:44:02]</span> synthesis round 1 · conditional 6.8/10
        </div>
        <div>
          <span className="ts">[09:46:38]</span> round 2 complete · confidence drift +0.4
        </div>
        <div>
          <span className="ts">[09:49:14]</span> stress tests · 4/4 passed
        </div>
        <div>
          <span className="ts">[09:51:00]</span>{" "}
          <span className="hot">session complete · 47,214 tokens · pdf generated</span>
        </div>
      </div>
    </section>
  );
}
