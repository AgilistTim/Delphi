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
      const res = await fetch(new URL("/api/run", window.location.origin).toString(), {
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
      const url = new URL(`/api/run/stream?runId=${encodeURIComponent(data.runId)}`, window.location.origin).toString();
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
      await fetch(new URL(`/api/run?runId=${encodeURIComponent(runId)}`, window.location.origin).toString(), { method: "DELETE" });
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

  const statusConfig = {
    idle: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
    running: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500 animate-pulse" },
    completed: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
    error: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  };

  const currentStatus = statusConfig[status];

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-white">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">New Analysis</h2>
              <p className="text-sm text-indigo-100">Configure and run a Delphi consensus process</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${currentStatus.bg}`}>
            <span className={`w-2 h-2 rounded-full ${currentStatus.dot}`}></span>
            <span className={`text-sm font-medium ${currentStatus.text} capitalize`}>{status}</span>
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        <div className="grid gap-5">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">Question</label>
            <Input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What question should the Delphi process analyze?"
              disabled={disabled}
              className="h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">Context (optional)</label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Additional context, constraints, or background information..."
              rows={3}
              disabled={disabled}
              className="border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="grid gap-2 flex-1 min-w-[140px] max-w-[180px]">
              <label className="text-sm font-medium text-slate-700">Expert Count</label>
              <Input
                type="number"
                min={3}
                max={10}
                value={experts}
                onChange={(e) => setExperts(Number(e.target.value))}
                disabled={disabled}
                className="border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-400">3-10 experts</span>
            </div>
            <div className="grid gap-2 flex-1 min-w-[140px] max-w-[180px]">
              <label className="text-sm font-medium text-slate-700">Max Rounds</label>
              <Input
                type="number"
                min={1}
                max={5}
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                disabled={disabled}
                className="border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-400">1-5 rounds</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={startRun} 
            disabled={!canStart} 
            className="min-w-32 h-11 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
          >
            {status === "running" ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Running...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Analysis
              </span>
            )}
          </Button>
          <Button
            onClick={stopRun}
            disabled={status !== "running"}
            variant="destructive"
            className="h-11"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Stop
          </Button>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">Live Output</label>
            {logs && (
              <button 
                onClick={() => setLogs("")}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <div
            ref={logRef}
            className="w-full h-64 overflow-auto rounded-xl border border-slate-200 bg-slate-900 p-4 text-slate-200 shadow-inner"
          >
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
              {logs || (
                <span className="text-slate-500">
                  Output will appear here when you start an analysis...
                </span>
              )}
            </pre>
          </div>
        </div>

        {status === "completed" && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-green-700">
              Analysis complete! Refresh the page to see the new run in the history below.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
