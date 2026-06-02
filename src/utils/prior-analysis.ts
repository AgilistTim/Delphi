import { PriorAnalysisReference } from '../types/index.js';
import { getStore } from '../storage/index.js';

export async function findRelatedAnalyses(
  question: string,
  maxResults: number = 3
): Promise<PriorAnalysisReference[]> {
  return getStore().findPriorAnalyses(question, maxResults);
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
