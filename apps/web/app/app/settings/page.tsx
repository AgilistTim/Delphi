"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Logo } from "../../components/Logo";
import { Footer } from "../../components/Footer";

interface KeyStatus {
  has_key: boolean;
  masked: string | null;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const missingKey = searchParams.get("missing_key") === "1";
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/keys")
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => setStatus({ has_key: false, masked: null }));
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: keyInput.trim() })
    });
    const data = await res.json();
    if (res.ok) {
      setStatus({ has_key: true, masked: data.masked });
      setKeyInput("");
      setFeedback({ type: "ok", msg: `Key saved — using ${data.masked}` });
    } else {
      setFeedback({ type: "error", msg: data.error ?? "Save failed" });
    }
    setSaving(false);
  }

  async function onRemove() {
    if (!confirm("Remove your stored API key? You won't be able to run deliberations until you add a new one.")) return;
    setRemoving(true);
    setFeedback(null);
    const res = await fetch("/api/keys", { method: "DELETE" });
    if (res.ok) {
      setStatus({ has_key: false, masked: null });
      setFeedback({ type: "ok", msg: "Key removed." });
    } else {
      setFeedback({ type: "error", msg: "Remove failed — try again." });
    }
    setRemoving(false);
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Logo small />
        <Link href="/app" className="btn sm ghost">
          ← dashboard
        </Link>
      </div>

      <h1 style={{ marginTop: 20 }}>Settings</h1>
      <p style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 4 }}>
        Delphi runs on your Anthropic API key. Your key is stored server-side and never
        returned to the browser — it&rsquo;s only forwarded to the engine when you start a run.
      </p>

      {missingKey && (
        <div className="box danger" style={{ marginTop: 14, padding: "10px 14px", fontSize: 14 }}>
          You need to add an Anthropic API key before you can run a deliberation.
        </div>
      )}

      <div className="box" style={{ marginTop: 24 }}>
        <div className="mono">Anthropic API key</div>

        {status === null ? (
          <div className="mono" style={{ fontSize: 10, marginTop: 10 }}>
            Loading…
          </div>
        ) : status.has_key ? (
          <div className="stack" style={{ marginTop: 12 }}>
            <div className="box ok row between" style={{ padding: "8px 12px" }}>
              <div>
                <span className="pill ok" style={{ marginRight: 8 }}>
                  active
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                  {status.masked}
                </span>
              </div>
            </div>
            <div className="row between" style={{ marginTop: 4 }}>
              <span className="mono" style={{ fontSize: 10 }}>
                Replace your key by pasting a new one below.
              </span>
              <button
                className="btn sm ghost"
                onClick={onRemove}
                disabled={removing}
                style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
              >
                {removing ? "Removing…" : "Remove key"}
              </button>
            </div>
          </div>
        ) : (
          <div className="box dashed" style={{ marginTop: 12, padding: 10 }}>
            <span className="pill danger" style={{ marginRight: 8 }}>
              no key
            </span>
            <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
              Add your Anthropic key to run deliberations.
            </span>
          </div>
        )}

        <form onSubmit={onSave} className="stack" style={{ marginTop: 16 }}>
          <div>
            <label className="label-txt" htmlFor="api-key">
              {status?.has_key ? "Replace key" : "Add key"} · paste from{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "underline" }}
              >
                console.anthropic.com
              </a>
            </label>
            <input
              id="api-key"
              className="input"
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-ant-api03-…"
              autoComplete="off"
              spellCheck={false}
              required
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
            />
          </div>

          {feedback && (
            <div
              className={`box ${feedback.type === "ok" ? "ok" : "danger"}`}
              style={{ padding: "8px 12px", fontSize: 13 }}
            >
              {feedback.msg}
            </div>
          )}

          <div className="row between" style={{ marginTop: 4 }}>
            <span className="mono" style={{ fontSize: 10 }}>
              Anthropic keys start with sk-ant- · never stored in plain text in your browser
            </span>
            <button className="btn primary" type="submit" disabled={saving || !keyInput.trim()}>
              {saving ? "Saving…" : "Save key →"}
            </button>
          </div>
        </form>
      </div>

      <div className="box filled" style={{ marginTop: 20 }}>
        <div className="mono">How it works</div>
        <ul style={{ fontSize: 14, lineHeight: 1.7, paddingLeft: 20, marginTop: 8 }}>
          <li>Your key is stored server-side, scoped to your account only.</li>
          <li>Each deliberation is billed directly to your Anthropic account.</li>
          <li>
            A typical run (5 experts · 3 rounds) uses roughly{" "}
            <strong>15,000–30,000 tokens</strong> — about $0.15–$0.45 at Sonnet pricing.
          </li>
          <li>You can remove your key at any time. Existing reports are unaffected.</li>
          <li>
            Need an Anthropic key?{" "}
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "underline" }}
            >
              console.anthropic.com
            </a>
          </li>
        </ul>
      </div>

      <Footer />
    </div>
  );
}
