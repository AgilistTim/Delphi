"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "../../components/Logo";
import { DisclosureBanner } from "../../components/DisclosureBanner";
import { Footer } from "../../components/Footer";

export default function NewSessionPage() {
  const router = useRouter();
  const [experts, setExperts] = useState(5);
  const [rounds, setRounds] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const estTokens = experts * rounds * 3000;
  const estMinutes = Math.max(3, Math.round((experts * rounds * 30) / 60));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      question: form.get("question"),
      context: form.get("context"),
      constraints: form.get("constraints"),
      experts,
      rounds
    };
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({ id: "4f2a" }));
    router.push(`/app/s/${data.id || "4f2a"}`);
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Logo small />
        <span className="mono">new decision</span>
      </div>

      <DisclosureBanner compact />

      <h1 style={{ marginTop: 20 }}>Shape the decision.</h1>
      <p style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 4 }}>
        Three fields. Skipping context means worse output — so don&rsquo;t.
      </p>

      <form onSubmit={onSubmit} className="stack" style={{ marginTop: 20 }}>
        <div>
          <label className="label-txt" htmlFor="question">
            ① The question
          </label>
          <textarea
            id="question"
            name="question"
            required
            className="textarea"
            style={{ minHeight: 60 }}
            placeholder="Should we deprecate our free tier?"
          />
        </div>

        <div>
          <label className="label-txt" htmlFor="context">
            ② Context · who&rsquo;s asking, stakes, timing
          </label>
          <textarea
            id="context"
            name="context"
            required
            className="textarea"
            placeholder="B2B SaaS, 40 eng, £4.2m ARR, runway 14 months. Board wants a margin story by Q3."
          />
        </div>

        <div>
          <label className="label-txt" htmlFor="constraints">
            ③ Constraints · what can&rsquo;t change
          </label>
          <input
            id="constraints"
            name="constraints"
            className="input"
            placeholder="No layoffs · must ship by Q3 · CFO in the loop"
          />
        </div>

        <div className="grid-2">
          <div>
            <label className="label-txt">Experts</label>
            <div className="box filled row between" style={{ padding: "6px 10px" }}>
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => setExperts(Math.max(3, experts - 1))}
              >
                –
              </button>
              <span style={{ fontFamily: "'Caveat', cursive", fontSize: 20, fontWeight: 700 }}>
                {experts}
              </span>
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => setExperts(Math.min(7, experts + 1))}
              >
                +
              </button>
            </div>
          </div>
          <div>
            <label className="label-txt">Rounds</label>
            <div className="box filled row between" style={{ padding: "6px 10px" }}>
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => setRounds(Math.max(2, rounds - 1))}
              >
                –
              </button>
              <span style={{ fontFamily: "'Caveat', cursive", fontSize: 20, fontWeight: 700 }}>
                {rounds}
              </span>
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => setRounds(Math.min(5, rounds + 1))}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="hr dashed" />

        <div className="row between wrap" style={{ gap: 10 }}>
          <span className="mono" style={{ fontSize: 10 }}>
            est. {estTokens.toLocaleString()} tokens · ~{estMinutes} min
          </span>
          <button className="btn primary lg" type="submit" disabled={submitting}>
            {submitting ? "Starting…" : "Run deliberation →"}
          </button>
        </div>
      </form>

      <Footer />
    </div>
  );
}
