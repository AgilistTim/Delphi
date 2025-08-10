import fs from 'fs';
import path from 'path';

export type TerminationReason = 'consensus_reached' | 'max_rounds' | 'divergence_stable' | string;

export interface Citation {
  title: string;
  url: string;
  date?: string;
  relevance?: string;
}

export interface DelphiReport {
  prompt: {
    question: string;
    context?: string;
  };
  consensus_summary: {
    final_position: string;
    support_level: string;
    confidence_level: number;
    key_evidence: Citation[];
  };
  expert_positions: Array<{
    position: string;
    reasoning: string;
    confidence: number;
    sources: Citation[];
    expertise_area?: string;
    agent_id?: string;
  }>;
  contrarian_observations: Array<{
    critique: string;
    alternative_framework: string;
    blind_spots: string[];
    counter_evidence?: Array<{ title: string; url: string; summary: string }>;
  }>;
  dissenting_views: Array<{
    position: string;
    expert_ids: string[];
    reasoning: string;
    sources: Citation[];
  }>;
  convergence_analysis: {
    position_stability: number;
    confidence_spread: number;
    consensus_clarity: number;
    citation_overlap: number;
    rounds_completed: number;
    termination_reason: TerminationReason;
  };
  round_history: any[];
  generated_at: string | Date;
  // Some runs may include this field as per current implementation
  failed_experts?: Array<{ role: string; error: string }>;
}

export interface RunSummary {
  slug: string;           // filename without extension
  file: string;           // filename
  path: string;           // absolute path
  mtimeMs: number;        // last modified time for sorting
  question: string;
  generatedAt: string;
  roundsCompleted: number;
  terminationReason: TerminationReason;
  supportLevel?: string;
  confidenceLevel?: number;
}

function getOutputDir(): string {
  // Next.js API/server components will have cwd at apps/dashboard
  // output/ is at repo root: ../../output from dashboard
  return path.resolve(process.cwd(), '..', '..', 'output');
}

function isReportJson(filename: string): boolean {
  return filename.endsWith('.json') && filename.startsWith('delphi-report-');
}

export function listReportFiles(): string[] {
  const dir = getOutputDir();
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir);
  return files.filter(isReportJson);
}

export function fileToSlug(filename: string): string {
  return filename.replace(/\.json$/, '');
}

export function slugToFile(slug: string): string {
  return `${slug}.json`;
}

export function getReportPath(filename: string): string {
  return path.join(getOutputDir(), filename);
}

export function readReport(slug: string): DelphiReport | null {
  try {
    const file = slugToFile(slug);
    const fullPath = getReportPath(file);
    if (!fs.existsSync(fullPath)) return null;
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const json = JSON.parse(raw);
    return json as DelphiReport;
  } catch {
    return null;
  }
}

export function listReports(): RunSummary[] {
  const dir = getOutputDir();
  if (!fs.existsSync(dir)) return [];

  const files = listReportFiles();
  const summaries: RunSummary[] = [];

  for (const file of files) {
    try {
      const abs = getReportPath(file);
      const stat = fs.statSync(abs);
      const raw = fs.readFileSync(abs, 'utf-8');
      const report = JSON.parse(raw) as DelphiReport;

      const summary: RunSummary = {
        slug: fileToSlug(file),
        file,
        path: abs,
        mtimeMs: stat.mtimeMs,
        question: report?.prompt?.question || 'Unknown Question',
        generatedAt: (report?.generated_at
          ? new Date(report.generated_at as any).toISOString()
          : new Date(stat.mtimeMs).toISOString()),
        roundsCompleted: report?.convergence_analysis?.rounds_completed ?? 0,
        terminationReason: report?.convergence_analysis?.termination_reason ?? 'max_rounds',
        supportLevel: report?.consensus_summary?.support_level,
        confidenceLevel: report?.consensus_summary?.confidence_level
      };

      summaries.push(summary);
    } catch {
      // skip malformed file
      continue;
    }
  }

  // Sort by modified time desc (most recent first)
  summaries.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return summaries;
}

/**
 * Get absolute artifact paths for a given run slug.
 * Slug corresponds to the base filename (without extension), e.g. "delphi-report-2025-01-01-...".
 */
export function getArtifactPaths(slug: string): { json: string; md: string; exists: { json: boolean; md: boolean } } {
  const dir = getOutputDir();
  const json = path.join(dir, `${slug}.json`);
  const md = path.join(dir, `${slug}.md`);
  return {
    json,
    md,
    exists: {
      json: fs.existsSync(json),
      md: fs.existsSync(md)
    }
  };
}

/**
 * Read the Markdown artifact for a run if available.
 */
export function readMarkdown(slug: string): string | null {
  try {
    const { md, exists } = getArtifactPaths(slug);
    if (!exists.md) return null;
    return fs.readFileSync(md, 'utf-8');
  } catch {
    return null;
  }
}
