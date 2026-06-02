import { Retrospective, SignalTracker, SignalStatus } from '../types/index.js';
import { getStore } from '../storage/index.js';

export async function loadRetrospectives(): Promise<Retrospective[]> {
  return getStore().loadRetrospectives();
}

export async function saveRetrospective(retrospective: Retrospective): Promise<void> {
  await getStore().saveRetrospective(retrospective);
}

export async function getCalibrationSummary(): Promise<{
  total: number;
  correct: number;
  partially_correct: number;
  incorrect: number;
  accuracy_rate: number;
}> {
  const retrospectives = (await loadRetrospectives()).filter(r => r.outcome !== 'too_early');
  const total = retrospectives.length;
  const correct = retrospectives.filter(r => r.outcome === 'correct').length;
  const partially_correct = retrospectives.filter(r => r.outcome === 'partially_correct').length;
  const incorrect = retrospectives.filter(r => r.outcome === 'incorrect').length;
  const accuracy_rate = total > 0 ? (correct + partially_correct * 0.5) / total : 0;

  return { total, correct, partially_correct, incorrect, accuracy_rate };
}

export async function loadSignalTrackers(): Promise<SignalTracker[]> {
  return getStore().loadSignalTrackers();
}

export async function saveSignalTracker(tracker: SignalTracker): Promise<void> {
  await getStore().saveSignalTracker(tracker);
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
