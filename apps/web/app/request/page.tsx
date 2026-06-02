"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "../components/Logo";
import { DisclosureBanner } from "../components/DisclosureBanner";
import { Footer } from "../components/Footer";

export default function RequestAccessPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const res = await fetch("/api/access-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Request failed");
      router.push("/request/sent");
    } catch (err) {
      setError("Something went wrong. Try again, or email tim@agilist.co.uk directly.");
      setSubmitting(false);
    }
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Logo small />
        <span className="mono">request access</span>
      </div>

      <h1 style={{ fontSize: 32 }}>Request access.</h1>
      <p style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 4, marginBottom: 16 }}>
        Tim reviews every request personally. Expect a reply within a day.
      </p>

      <DisclosureBanner />

      <form onSubmit={onSubmit} className="stack" style={{ marginTop: 18 }} aria-busy={submitting}>
        <div className="grid-2">
          <div>
            <label className="label-txt" htmlFor="email">
              Work email
            </label>
            <input
              className="input"
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@company.co.uk"
            />
          </div>
          <div>
            <label className="label-txt" htmlFor="company">
              Company
            </label>
            <input className="input" id="company" name="company" required placeholder="Acme Co." />
          </div>
        </div>

        <div>
          <label className="label-txt" htmlFor="role">
            Role
          </label>
          <input
            className="input"
            id="role"
            name="role"
            required
            placeholder="Head of Strategy"
          />
        </div>

        <div>
          <label className="label-txt" htmlFor="context">
            What decision are you wrestling with?
          </label>
          <textarea
            className="textarea"
            id="context"
            name="context"
            required
            minLength={40}
            placeholder={`e.g. "Whether to consolidate three product lines into one — 40 engineers across three teams, board wants a margin story by Q3..."`}
          />
          <div className="mono" style={{ fontSize: 10, marginTop: 4 }}>
            min 40 characters · this is what Tim reads first
          </div>
        </div>

        <label
          className="row top"
          style={{ gap: 10, alignItems: "flex-start", fontSize: 13, marginTop: 4 }}
        >
          <input
            type="checkbox"
            id="consent"
            name="consent"
            required
            style={{
              width: 16,
              height: 16,
              accentColor: "var(--accent)",
              marginTop: 2,
              flexShrink: 0
            }}
          />
          <span>
            I understand my sessions are stored and Tim may review them for consulting follow-up.
          </span>
        </label>

        {error && (
          <div className="box danger" style={{ padding: 10, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div className="row between" style={{ marginTop: 8 }}>
          <span className="mono" style={{ fontSize: 10 }}>
            no subscription · no password · ~24h reply
          </span>
          <button className="btn primary lg" type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Submit request →"}
          </button>
        </div>
      </form>

      <Footer />
    </div>
  );
}
