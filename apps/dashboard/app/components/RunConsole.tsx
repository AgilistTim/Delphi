"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RunStatus = "idle" | "running" | "completed" | "error";

export default function RunConsole() {
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [experts, setExperts] = useState<number>(5);
  const [rounds, setRounds] = useState<number>(3);

  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [logs, setLogs] = useState<string>("");

  const esRef = useRef<EventSource | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const canStart = useMemo(() => {
    return status !== "running" && question.trim().length > 0;
  }, [status, question]);

  const appendLog = useCallback((chunk: string) => {
    setLogs((prev) => (prev ? prev + "\n" + chunk : chunk));
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [logs]);

  const cleanupStream = useCallback(() => {
    if (esRef.current) {
      try {
        esRef.current.close();
      } catch {
        // ignore
      } finally {
        esRef.current = null;
      }
    }
  }, []);

  const startRun = useCallback(async () => {
    if (!canStart) return;
    setStatus("running");
    setLogs("");
    setRunId(null);

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          context: context.trim() || undefined,
          experts: Number(experts) || 5,
          rounds: Number(rounds) || 3
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus("error");
        appendLog(`Failed to start run: ${err?.error || res.statusText}`);
        return;
      }

      const data = (await res.json()) as { runId: string };
      setRunId(data.runId);

      // Open SSE
      const url = `/api/run/stream?runId=${encodeURIComponent(data.runId)}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener("status", (evt) => {
        try {
          const payload = JSON.parse((evt as MessageEvent).data);
          if (payload?.status) {
            setStatus(payload.status as RunStatus);
          }
        } catch {
          // ignore
        }
      });

      es.addEventListener("end", (evt) => {
        try {
          const payload = JSON.parse((evt as MessageEvent).data);
          if (payload?.status) {
            setStatus(payload.status as RunStatus);
          } else {
            setStatus("completed");
          }
        } catch {
          setStatus("completed");
        } finally {
          cleanupStream();
        }
      });

      es.onmessage = (evt) => {
        appendLog(evt.data);
      };

      es.onerror = () => {
        appendLog("[SSE connection error]");
        // do not flip status immediately; CLI may still be running
      };
    } catch (e: any) {
      setStatus("error");
      appendLog(`Error starting run: ${e?.message || String(e)}`);
      cleanupStream();
    }
  }, [appendLog, canStart, cleanupStream, context, experts, question, rounds]);

  const stopRun = useCallback(async () => {
    if (!runId) return;
    try {
      await fetch(`/api/run?runId=${encodeURIComponent(runId)}`, { method: "DELETE" });
    } catch {
      // ignore
    } finally {
      cleanupStream();
      setStatus("idle");
    }
  }, [cleanupStream, runId]);

  const disabled = status === "running";

  return (
    <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>New Run</h2>

      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>Question</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What question should the Delphi process analyze?"
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              padding: "8px 10px",
              fontSize: 14
            }}
            disabled={disabled}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>Context (optional)</label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Additional context, constraints, or background"
            rows={3}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              padding: "8px 10px",
              fontSize: 14,
              resize: "vertical"
            }}
            disabled={disabled}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ display: "grid", gap: 6, maxWidth: 160 }}>
            <label style={{ fontSize: 14, fontWeight: 600 }}>Experts</label>
            <input
              type="number"
              min={3}
              max={10}
              value={experts}
              onChange={(e) => setExperts(Number(e.target.value))}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 14
              }}
              disabled={disabled}
            />
          </div>
          <div style={{ display: "grid", gap: 6, maxWidth: 160 }}>
            <label style={{ fontSize: 14, fontWeight: 600 }}>Max Rounds</label>
            <input
              type="number"
              min={1}
              max={5}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 14
              }}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <button
          onClick={startRun}
          disabled={!canStart}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            background: canStart ? "#111827" : "#9ca3af",
            color: "white",
            fontSize: 14,
            cursor: canStart ? "pointer" : "not-allowed"
          }}
        >
          {status === "running" ? "Running..." : "Start Run"}
        </button>
        <button
          onClick={stopRun}
          disabled={status !== "running"}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            background: status === "running" ? "#ef4444" : "#f3f4f6",
            color: status === "running" ? "white" : "#6b7280",
            fontSize: 14,
            cursor: status === "running" ? "pointer" : "not-allowed"
          }}
        >
          Stop
        </button>
        <span style={{ fontSize: 13, color: "#6b7280" }}>
          Status:{" "}
          <span style={{ fontWeight: 600, color: status === "completed" ? "#059669" : status === "error" ? "#dc2626" : "#111827" }}>
            {status}
          </span>
        </span>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ fontSize: 14, fontWeight: 700 }}>Live Log</label>
        <textarea
          ref={textareaRef}
          readOnly
          value={logs}
          rows={14}
          style={{
            width: "100%",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            padding: 10,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
            fontSize: 12,
            background: "#0b1020",
            color: "#e5e7eb",
            whiteSpace: "pre",
            overflow: "auto"
          }}
          placeholder="Logs will appear here after you start a run..."
        />
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
        Tip: After completion, click Refresh in your browser to see the new run in the history table below.
      </div>
    </section>
  );
}
