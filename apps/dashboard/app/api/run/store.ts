import { type ChildProcessWithoutNullStreams } from 'child_process';
import { EventEmitter } from 'events';

export type RunStatus = 'running' | 'completed' | 'error';

export type RunRecord = {
  id: string;
  proc: ChildProcessWithoutNullStreams;
  emitter: EventEmitter;
  startedAt: number;
  status: RunStatus;
};

declare global {
  var __delphiRuns: Map<string, RunRecord> | undefined;
}

function getRunsMap(): Map<string, RunRecord> {
  if (!globalThis.__delphiRuns) {
    globalThis.__delphiRuns = new Map<string, RunRecord>();
  }
  return globalThis.__delphiRuns;
}

export function getRunRecord(runId: string): RunRecord | undefined {
  return getRunsMap().get(runId);
}

export function setRunRecord(runId: string, record: RunRecord): void {
  getRunsMap().set(runId, record);
}

export function deleteRunRecord(runId: string): boolean {
  return getRunsMap().delete(runId);
}
