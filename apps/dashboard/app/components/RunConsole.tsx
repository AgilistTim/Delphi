"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

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
  const logRef = useRef<HTMLDivElement | null>(null);

  const canStart = useMemo(() => {
    return status !== "running" && question.trim().length > 0;
  }, [status, question]);

  const appendLog = useCallback((chunk: string) => {
    setLogs((prev) => (prev ? prev + "\n" + chunk : chunk));
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
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
          rounds: Number(rounds) || 3,
        }),
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
  const statusVariant =
    status === "completed"
      ? "success"
      : status === "error"
      ? "destructive"
      : status === "running"
      ? "warning"
      : "secondary";

  return (
    <Card className="mb-4">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>New Run</CardTitle>
            <CardDescription>Configure a run and stream live logs.</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={statusVariant as any}>{status}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Question</label>
            <Input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What question should the Delphi process analyze?"
              disabled={disabled}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Context (optional)</label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Additional context, constraints, or background"
              rows={3}
              disabled={disabled}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="grid gap-2 max-w-[180px]">
              <label className="text-sm font-medium">Experts</label>
              <Input
                type="number"
                min={3}
                max={10}
                value={experts}
                onChange={(e) => setExperts(Number(e.target.value))}
                disabled={disabled}
              />
            </div>
            <div className="grid gap-2 max-w-[180px]">
              <label className="text-sm font-medium">Max Rounds</label>
              <Input
                type="number"
                min={1}
                max={5}
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={startRun} disabled={!canStart} className="min-w-28">
            {status === "running" ? "Running..." : "Start Run"}
          </Button>
          <Button
            onClick={stopRun}
            disabled={status !== "running"}
            variant="destructive"
          >
            Stop
          </Button>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold">Live Log</label>
          <div
            ref={logRef}
            className="w-full h-72 overflow-auto rounded-md border bg-[#0b1020] p-3 text-slate-200"
          >
            <pre className="whitespace-pre font-mono text-xs leading-relaxed">
              {logs || "Logs will appear here after you start a run..."}
            </pre>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Tip: After completion, click Refresh in your browser to see the new run in the history table below.
        </p>
      </CardContent>
    </Card>
  );
}
