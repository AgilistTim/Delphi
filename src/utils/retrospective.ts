import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { Retrospective, SignalTracker, SignalStatus } from '../types/index.js';

const RETROSPECTIVES_FILE = 'output/retrospectives.json';
const SIGNAL_TRACKERS_FILE = 'output/signal-trackers.json';

function ensureOutputDir(): void {
  if (!existsSync('output')) {
    mkdirSync('output', { recursive: true });
  }
}

export function loadRetrospectives(): Retrospective[] {
  try {
    if (!existsSync(RETROSPECTIVES_FILE)) return [];
    return JSON.parse(readFileSync(RETROSPECTIVES_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function saveRetrospective(retrospective: Retrospective): void {
  ensureOutputDir();
  const existing = loadRetrospectives();
  const index = existing.findIndex(r => r.report_slug === retrospective.report_slug);
  if (index >= 0) {
    existing[index] = retrospective;
  } else {
    existing.push(retrospective);
  }
  writeFileSync(RETROSPECTIVES_FILE, JSON.stringify(existing, null, 2), 'utf-8');
}

export function getCalibrationSummary(): {
  total: number;
  correct: number;
  partially_correct: number;
  incorrect: number;
  accuracy_rate: number;
} {
  const retrospectives = loadRetrospectives().filter(r => r.outcome !== 'too_early');
  const total = retrospectives.length;
  const correct = retrospectives.filter(r => r.outcome === 'correct').length;
  const partially_correct = retrospectives.filter(r => r.outcome === 'partially_correct').length;
  const incorrect = retrospectives.filter(r => r.outcome === 'incorrect').length;
  const accuracy_rate = total > 0 ? (correct + partially_correct * 0.5) / total : 0;

  return { total, correct, partially_correct, incorrect, accuracy_rate };
}

export function loadSignalTrackers(): SignalTracker[] {
  try {
    if (!existsSync(SIGNAL_TRACKERS_FILE)) return [];
    return JSON.parse(readFileSync(SIGNAL_TRACKERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function saveSignalTracker(tracker: SignalTracker): void {
  ensureOutputDir();
  const existing = loadSignalTrackers();
  const index = existing.findIndex(t => t.report_slug === tracker.report_slug);
  if (index >= 0) {
    existing[index] = tracker;
  } else {
    existing.push(tracker);
  }
  writeFileSync(SIGNAL_TRACKERS_FILE, JSON.stringify(existing, null, 2), 'utf-8');
}

export function initializeSignalTracker(
  reportSlug: string,
  consensusSignals: string[],
  oppositionalSignals: string[]
): SignalTracker {
  const now = new Date().toISOString();
  const toStatus = (signal: string): SignalStatus => ({
    signal,
    status: 'not_observed',
    updated_at: now
  });

  return {
    report_slug: reportSlug,
    consensus_signals: consensusSignals.map(toStatus),
    oppositional_signals: oppositionalSignals.map(toStatus),
    last_reviewed: now
  };
}
