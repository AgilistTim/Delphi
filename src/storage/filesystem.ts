import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DelphiReport, PriorAnalysisReference, SignalTracker, Retrospective } from '../types/index.js';
import { Store } from './types.js';

const OUTPUT_DIR = process.env.DELPHI_OUTPUT_DIR || 'output';
const RETROSPECTIVES_FILE = join(OUTPUT_DIR, 'retrospectives.json');
const SIGNAL_TRACKERS_FILE = join(OUTPUT_DIR, 'signal-trackers.json');

function ensureOutputDir(): void {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Filesystem-backed store. Preserves the original CLI behaviour: reports,
 * signal trackers and retrospectives all live as JSON/Markdown files under
 * the `output/` directory.
 */
export class FilesystemStore implements Store {
  async saveReport(report: DelphiReport, markdown: string, slug: string): Promise<{ slug: string }> {
    ensureOutputDir();
    const mdPath = join(OUTPUT_DIR, `${slug}.md`);
    const jsonPath = join(OUTPUT_DIR, `${slug}.json`);
    writeFileSync(mdPath, markdown, 'utf-8');
    writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`📄 Report saved to: ${mdPath}`);
    console.log(`📊 Data saved to: ${jsonPath}`);
    return { slug };
  }

  async saveAgentLogs(logs: unknown[], question: string): Promise<void> {
    ensureOutputDir();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const sanitized = question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50);
    const logFile = join(OUTPUT_DIR, `agent-logs-${timestamp}-${sanitized}.json`);
    writeFileSync(logFile, JSON.stringify(logs, null, 2), 'utf-8');
    console.log(`📝 Agent logs saved to: ${logFile}`);
  }

  async findPriorAnalyses(question: string, maxResults = 3): Promise<PriorAnalysisReference[]> {
    if (!existsSync(OUTPUT_DIR)) return [];

    const files = readdirSync(OUTPUT_DIR).filter(
      f => f.endsWith('.json') && f.startsWith('delphi-report-')
    );

    const references: PriorAnalysisReference[] = [];
    const questionWords = new Set(
      question.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    );

    for (const file of files) {
      try {
        const raw = readFileSync(join(OUTPUT_DIR, file), 'utf-8');
        const report = JSON.parse(raw);
        const prevQuestion = report?.prompt?.question || '';
        const prevPosition = report?.consensus_summary?.final_position || '';

        const prevWords = new Set(
          prevQuestion.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3)
        );

        const overlap = [...questionWords].filter(w => prevWords.has(w));
        const relevance_score = overlap.length / Math.max(questionWords.size, 1);

        if (relevance_score > 0.15) {
          references.push({
            slug: file.replace('.json', ''),
            question: prevQuestion,
            consensus_position: prevPosition,
            relevance_score,
            relevance_rationale: `Shares ${overlap.length} key terms: ${overlap.slice(0, 5).join(', ')}`
          });
        }
      } catch {
        continue;
      }
    }

    return references
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, maxResults);
  }

  async loadSignalTrackers(): Promise<SignalTracker[]> {
    try {
      if (!existsSync(SIGNAL_TRACKERS_FILE)) return [];
      return JSON.parse(readFileSync(SIGNAL_TRACKERS_FILE, 'utf-8'));
    } catch {
      return [];
    }
  }

  async saveSignalTracker(tracker: SignalTracker): Promise<void> {
    ensureOutputDir();
    const existing = await this.loadSignalTrackers();
    const index = existing.findIndex(t => t.report_slug === tracker.report_slug);
    if (index >= 0) {
      existing[index] = tracker;
    } else {
      existing.push(tracker);
    }
    writeFileSync(SIGNAL_TRACKERS_FILE, JSON.stringify(existing, null, 2), 'utf-8');
  }

  async loadRetrospectives(): Promise<Retrospective[]> {
    try {
      if (!existsSync(RETROSPECTIVES_FILE)) return [];
      return JSON.parse(readFileSync(RETROSPECTIVES_FILE, 'utf-8'));
    } catch {
      return [];
    }
  }

  async saveRetrospective(retrospective: Retrospective): Promise<void> {
    ensureOutputDir();
    const existing = await this.loadRetrospectives();
    const index = existing.findIndex(r => r.report_slug === retrospective.report_slug);
    if (index >= 0) {
      existing[index] = retrospective;
    } else {
      existing.push(retrospective);
    }
    writeFileSync(RETROSPECTIVES_FILE, JSON.stringify(existing, null, 2), 'utf-8');
  }
}
