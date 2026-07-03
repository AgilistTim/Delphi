"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "../../../components/Logo";
import { Footer } from "../../../components/Footer";

interface RunState {
  run_id: string;
  status: "pending" | "running" | "completed" | "error";
  question: string;
  started_at: number;
  completed_at?: number;
  error?: string;
}

export default function DeliberationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [run, setRun] = useState<RunState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/session/${params.id}`, { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 404) setError("Session not found. Start a new one from the dashboard.");
          return;
        }
        const data = (await res.json()) as RunState;
        if (cancelled) return;
        setRun(data);
        if (data.status === "completed") {
          router.replace(`/app/s/${params.id}/report`);
        } else if (data.status === "error") {
          setError(data.error || "Engine error");
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }

    poll();
    const iv = setInterval(poll, 3000);
    const tick = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      cancelled = true;
      clearInterval(iv);
      clearInterval(tick);
    };
  }, [params.id, router]);

  const statusLabel =
    run?.status === "running"
      ? "deliberating"
      : run?.status === "pending"
        ? "queued"
        : run?.status || "loading";

  const mm = Math.floor(elapsed / 60);
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="shell">
      <div className="topbar">
        <div>
          <Logo small />
          <div className="mono" style={{ fontSize: 10, marginTop: 2 }}>
            session {params.id}
          </div>
        </div>
        <span className={`pill ${run?.status === "error" ? "danger" : "accent"}`}>{statusLabel}</span>
      </div>

      {error ? (
        <div className="box danger" style={{ padding: 14, marginTop: 20 }}>
          <strong>Something went wrong.</strong>
          <div style={{ fontSize: 13, marginTop: 6 }}>{error}</div>
          <Link href="/app" className="btn sm" style={{ marginTop: 10 }}>
            ← back to dashboard
          </Link>
        </div>
      ) : (
        <>
          <h2 style={{ marginTop: 20 }}>The panel is deliberating.</h2>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 6 }}>
            Five AI experts are working through {run?.question ? `“${run.question}”` : "your question"} — research,
            responses, cross-examination, stress tests, synthesis. Usually 3–6 minutes.
          </p>

          <div className="bar" style={{ marginTop: 20 }}>
            <div
              className="fill"
              style={{
                width: `${Math.min(100, Math.round((elapsed / 360) * 100))}%`,
                transition: "width 1s linear"
              }}
            />
          </div>
          <div className="mono" style={{ fontSize: 10, marginTop: 6 }}>
            {mm}:{ss} elapsed · page auto-refreshes every 3s
          </div>

          <div className="box" style={{ marginTop: 24, padding: 14 }}>
            <div className="mono">what&rsquo;s happening</div>
            <ul style={{ fontSize: 14, lineHeight: 1.7, paddingLeft: 20, marginTop: 6 }}>
              <li>Personas + research (~30s)</li>
              <li>Round 1: expert responses → synthesis → stress tests (~90s)</li>
              <li>Round 2: refined positions → cross-examination (~90s)</li>
              <li>Round 3: final synthesis → oppositional case → decision canvas (~90s)</li>
            </ul>
          </div>

          <div className="row between" style={{ marginTop: 24 }}>
            <Link href="/app" className="btn sm ghost">
              leave · we&rsquo;ll email you
            </Link>
            <button
              className="btn sm danger"
              disabled={stopping}
              onClick={async () => {
                setStopping(true);
                try {
                  const res = await fetch(`/api/session/${params.id}`, { method: "PATCH" });
                  if (res.ok) {
                    setError("Stopped by user");
                    setRun((prev) => prev ? { ...prev, status: "error" } : prev);
                  } else {
                    const data = await res.json().catch(() => ({}));
                    setError(data.error || "Failed to stop");
                  }
                } catch {
                  setError("Failed to stop");
                } finally {
                  setStopping(false);
                }
              }}
            >
              {stopping ? "stopping..." : "stop run"}
            </button>
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}
