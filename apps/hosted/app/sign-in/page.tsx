"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "../components/Logo";
import { Footer } from "../components/Footer";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email })
      });
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="shell" style={{ maxWidth: 480 }}>
      <div className="topbar">
        <Logo small />
        <span className="mono">{sent ? "link sent" : "sign in"}</span>
      </div>

      {!sent ? (
        <div className="center stack" style={{ marginTop: 40 }}>
          <h1 style={{ fontSize: 36 }}>Welcome back.</h1>
          <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>
            Enter your email — we&rsquo;ll send a fresh link.
          </p>
          <form onSubmit={onSend} className="stack" style={{ maxWidth: 320, margin: "18px auto 0" }}>
            <input
              type="email"
              required
              autoFocus
              className="input"
              placeholder="you@company.co.uk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ textAlign: "center" }}
            />
            <button className="btn primary lg" type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Send me a link →"}
            </button>
          </form>
          <div className="mono" style={{ fontSize: 10, marginTop: 18 }}>
            no password · no account · just approved email
          </div>
          <div className="hr dashed" style={{ maxWidth: 220, margin: "24px auto" }} />
          <Link href="/request" className="mono" style={{ fontSize: 10 }}>
            not approved yet? → request access
          </Link>
        </div>
      ) : (
        <div className="center stack" style={{ marginTop: 40 }}>
          <div
            style={{
              fontSize: 56,
              color: "var(--accent)",
              fontFamily: "'Caveat', cursive"
            }}
          >
            ✉
          </div>
          <h1 style={{ fontSize: 32 }}>Check your inbox.</h1>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", maxWidth: 320, margin: "0 auto" }}>
            Link sent to <strong style={{ color: "var(--ink)" }}>{email}</strong>. Expires in 30 min.
          </p>
          <div className="hr dashed" style={{ maxWidth: 220, margin: "20px auto" }} />
          <div className="row" style={{ justifyContent: "center", gap: 14 }}>
            <button
              className="mono"
              style={{
                fontSize: 10,
                background: "transparent",
                border: 0,
                cursor: "pointer",
                color: "var(--ink-soft)"
              }}
              onClick={() => setSent(false)}
            >
              try a different email
            </button>
            <span style={{ color: "var(--ink-faint)" }}>·</span>
            <button
              className="mono"
              style={{
                fontSize: 10,
                background: "transparent",
                border: 0,
                cursor: "pointer",
                color: "var(--ink-soft)"
              }}
              onClick={() => {
                setSubmitting(true);
                fetch("/api/magic-link", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ email })
                }).finally(() => setSubmitting(false));
              }}
            >
              resend
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
