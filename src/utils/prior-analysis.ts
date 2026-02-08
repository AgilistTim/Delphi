import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { PriorAnalysisReference } from '../types/index.js';

export function findRelatedAnalyses(
  question: string,
  outputDir: string = 'output',
  maxResults: number = 3
): PriorAnalysisReference[] {
  if (!existsSync(outputDir)) return [];

  const files = readdirSync(outputDir).filter(
    f => f.endsWith('.json') && f.startsWith('delphi-report-')
  );

  const references: PriorAnalysisReference[] = [];
  const questionWords = new Set(
    question.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  );

  for (const file of files) {
    try {
      const raw = readFileSync(join(outputDir, file), 'utf-8');
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

export function formatPriorAnalysesForExperts(references: PriorAnalysisReference[]): string {
  if (references.length === 0) return '';

  let formatted = `\n---\n## Prior Analyses on Related Topics\n\n`;
  formatted += `The following previous analyses may be relevant to this question:\n\n`;

  references.forEach((ref, index) => {
    formatted += `### Prior Analysis ${index + 1} (Relevance: ${(ref.relevance_score * 100).toFixed(0)}%)\n`;
    formatted += `**Question:** ${ref.question}\n`;
    formatted += `**Previous Consensus:** ${ref.consensus_position}\n`;
    formatted += `**Relevance:** ${ref.relevance_rationale}\n\n`;
  });

  formatted += `Consider how your analysis relates to or differs from these prior conclusions.\n`;
  return formatted;
}
