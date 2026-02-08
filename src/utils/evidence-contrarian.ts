import { PerplexityTool } from '../tools/perplexity.js';
import { EvidenceContrarianResult, ScoredCitation } from '../types/index.js';
import { scoreCitations } from './evidence-quality.js';

export async function searchCounterEvidence(
  perplexity: PerplexityTool,
  _consensusPosition: string,
  oppositePosition: string
): Promise<EvidenceContrarianResult> {
  console.log(`\n🔍 Evidence Contrarian: Searching for counterevidence...`);

  try {
    const searchQuery = `Evidence and arguments supporting: ${oppositePosition}`;
    const result = await perplexity.search({
      query: searchQuery,
      searchContextSize: 'high'
    });

    const rawCitations = result.citations.map(c => ({
      title: c.title,
      url: c.url,
      date: c.date,
      relevance: `Counterevidence: ${c.relevance || 'Supporting the oppositional position'}`
    }));

    const scoredEvidence: ScoredCitation[] = scoreCitations(rawCitations);

    const strengthAssessment = assessCounterEvidenceStrength(scoredEvidence, result.content);

    console.log(`   ✅ Found ${scoredEvidence.length} counterevidence sources`);

    return {
      counter_position: oppositePosition,
      evidence: scoredEvidence,
      strength_assessment: strengthAssessment
    };
  } catch (error) {
    console.warn(`   ⚠️ Evidence contrarian search failed:`, error);
    return {
      counter_position: oppositePosition,
      evidence: [],
      strength_assessment: 'Counterevidence search was unable to complete. The oppositional position remains untested against empirical evidence.'
    };
  }
}

function assessCounterEvidenceStrength(evidence: ScoredCitation[], _content: string): string {
  if (evidence.length === 0) {
    return 'No empirical counterevidence found. This may indicate the consensus is well-supported, or that the oppositional framing is too novel for existing literature.';
  }

  const avgQuality = evidence.reduce((sum, e) => sum + (e.evidence_quality?.overall_score ?? 0), 0) / evidence.length;
  const academicCount = evidence.filter(e => e.evidence_quality?.source_type === 'academic').length;
  const govCount = evidence.filter(e => e.evidence_quality?.source_type === 'government').length;

  if (avgQuality > 0.7 && (academicCount > 0 || govCount > 0)) {
    return `Strong counterevidence found (${evidence.length} sources, avg quality ${(avgQuality * 100).toFixed(0)}%). ${academicCount} academic and ${govCount} government sources directly support the oppositional position. The consensus should be treated with caution.`;
  }

  if (avgQuality > 0.4) {
    return `Moderate counterevidence found (${evidence.length} sources, avg quality ${(avgQuality * 100).toFixed(0)}%). Evidence exists but is not from the highest-quality sources. The consensus remains defensible but not unchallenged.`;
  }

  return `Weak counterevidence found (${evidence.length} sources, avg quality ${(avgQuality * 100).toFixed(0)}%). Sources are mostly lower-quality or tangential. The consensus appears well-supported by available evidence.`;
}
