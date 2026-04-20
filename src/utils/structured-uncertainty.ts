import { ExpertResponse, StructuredUncertainty } from '../types/index.js';
import { invokeModel, parseJsonFromText } from '../llm/invoke.js';
import type { CostTracker } from './cost-tracker.js';

export async function generateStructuredUncertainty(
  expertResponses: ExpertResponse[],
  costTracker?: CostTracker
): Promise<StructuredUncertainty[]> {
  const uncertainties: StructuredUncertainty[] = [];

  for (const expert of expertResponses) {
    try {
      const uncertainty = await analyzeExpertUncertainty(expert, costTracker);
      uncertainties.push(uncertainty);
    } catch (error) {
      console.warn(`Structured uncertainty failed for ${expert.agent_id}:`, error);
      uncertainties.push({
        overall_confidence: expert.confidence,
        confidence_by_claim: [],
        conditional_confidence: [],
        key_assumptions: []
      });
    }
  }

  return uncertainties;
}

async function analyzeExpertUncertainty(
  expert: ExpertResponse,
  costTracker?: CostTracker
): Promise<StructuredUncertainty> {
  const prompt = `Analyze this expert position and break down the uncertainty structure.

EXPERT: ${expert.expertise_area}
POSITION: ${expert.position}
REASONING: ${expert.reasoning.substring(0, 500)}
OVERALL CONFIDENCE: ${expert.confidence}/10
${expert.conditional_factors ? `CONDITIONAL FACTORS: ${expert.conditional_factors.join(', ')}` : ''}
${expert.strongest_counter_argument ? `STRONGEST COUNTER: ${expert.strongest_counter_argument}` : ''}

Return JSON:
{
  "overall_confidence": ${expert.confidence},
  "confidence_by_claim": [
    {"claim": "Main claim from the position", "confidence": 8},
    {"claim": "Secondary claim", "confidence": 6}
  ],
  "conditional_confidence": [
    {"condition": "An assumption that could change", "confidence_if_true": 9, "confidence_if_false": 3}
  ],
  "key_assumptions": ["Assumption 1", "Assumption 2"]
}

Extract 2-3 distinct claims, 1-2 conditional factors, and 2-3 key assumptions.`;

  const result = await invokeModel({
    tier: 'light',
    label: 'uncertainty',
    system:
      'You are an uncertainty analyst. Decompose expert confidence into structured uncertainty. Return valid JSON only.',
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 500,
    temperature: 0.3,
    agentId: expert.agent_id,
    costTracker
  });

  const parsed = parseJsonFromText<any>(result.text);
  if (!parsed) {
    return {
      overall_confidence: expert.confidence,
      confidence_by_claim: [],
      conditional_confidence: [],
      key_assumptions: []
    };
  }

  return {
    overall_confidence: parsed.overall_confidence ?? expert.confidence,
    confidence_by_claim: Array.isArray(parsed.confidence_by_claim) ? parsed.confidence_by_claim : [],
    conditional_confidence: Array.isArray(parsed.conditional_confidence)
      ? parsed.conditional_confidence
      : [],
    key_assumptions: Array.isArray(parsed.key_assumptions) ? parsed.key_assumptions : []
  };
}
