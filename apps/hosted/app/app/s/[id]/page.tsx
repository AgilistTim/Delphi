"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "../../../components/Logo";
import { Avatar } from "../../../components/Avatar";
import { Footer } from "../../../components/Footer";

type ExpertMessage = {
  name: string;
  role: string;
  confidence: number;
  msg: string;
  active: boolean;
};

const PANEL: ExpertMessage[] = [
  {
    name: "Dr Renu",
    role: "methodology skeptic",
    confidence: 7,
    msg: "Survivorship bias — free-tier conversion numbers read worse than they really are once you filter non-ICP.",
    active: true
  },
  {
    name: "JP Klein",
    role: "implementation realist",
    confidence: 6,
    msg: "Gate it, don't kill it. The funnel signal is worth more than the support cost you'd save.",
    active: false
  },
  {
    name: "Maya W",
    role: "ethics maximalist",
    confidence: 5,
    msg: "Existing free users are a trust obligation. Whatever you do, the migration path can't be silent.",
    active: false
  },
  {
    name: "A Hoyle",
    role: "operator pragmatist",
    confidence: 6,
    msg: "If support cost is the board's story, show margin impact over two quarters — not one.",
    active: false
  },
  {
    name: "K Tanaka",
    role: "data skeptic",
    confidence: 7,
    msg: "Before any decision — pull the cohort curve. I'd bet conversion is bimodal by vertical.",
    active: false
  }
];

export default function DeliberationPage({ params }: { params: { id: string } }) {
  const [progress, setProgress] = useState(62);
  const [tokens, setTokens] = useState(32000);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => Math.min(100, p + 0.6));
      setTokens((k) => Math.min(50000, k + 120));
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const remainingSeconds = Math.max(0, 160 - elapsed);
  const mm = Math.floor(remainingSeconds / 60);
  const ss = String(remainingSeconds % 60).padStart(2, "0");

  return (
    <div className="shell">
      <div className="topbar">
        <div>
          <Logo small />
          <div className="mono" style={{ fontSize: 10, marginTop: 2 }}>
            session {params.id} · deprecate free tier
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <span className="pill accent">round 2/3</span>
          <span className="pill">
            {Math.round(tokens / 1000)}k/50k
          </span>
        </div>
      </div>

      <div className="bar">
        <div className="fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="mono" style={{ fontSize: 10, marginTop: 6 }}>
        phase · expert responses → synthesis next
      </div>

      <div className="stack" style={{ marginTop: 18 }}>
        {PANEL.map((e) => (
          <div
            key={e.name}
            className={`row top ${e.active ? "" : "dim"}`}
            style={{ gap: 12, alignItems: "flex-start" }}
          >
            <Avatar name={e.name} />
            <div className={`box grow ${e.active ? "speaking" : ""}`}>
              <div className="row between">
                <span style={{ fontFamily: "'Caveat', cursive", fontSize: 16, fontWeight: 700 }}>
                  {e.name}
                </span>
                <span className="mono" style={{ fontSize: 10 }}>
                  conf {e.confidence}/10
                </span>
              </div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>
                {e.role}
              </div>
              <div style={{ fontSize: 14, marginTop: 6, lineHeight: 1.45 }}>
                {e.active && (
                  <span className="scribble" style={{ fontSize: 14, marginRight: 4 }}>
                    ↳
                  </span>
                )}
                {e.msg}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hr dashed" />

      <div className="row between wrap" style={{ gap: 10 }}>
        <Link href="/app" className="btn sm ghost">
          leave · we&rsquo;ll email you
        </Link>
        <span className="mono" style={{ fontSize: 10 }}>
          ~{mm}:{ss} remaining · {tokens.toLocaleString()} / 50,000 tokens
        </span>
      </div>

      <Footer />
    </div>
  );
}
