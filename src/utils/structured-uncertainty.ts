import OpenAI from 'openai';
import { safeChatCompletion } from './openai-helpers.js';
import { ExpertResponse, StructuredUncertainty } from '../types/index.js';

export async function generateStructuredUncertainty(
  openai: OpenAI,
  expertResponses: ExpertResponse[]
): Promise<StructuredUncertainty[]> {
  const uncertainties: StructuredUncertainty[] = [];

  for (const expert of expertResponses) {
    try {
      const uncertainty = await analyzeExpertUncertainty(openai, expert);
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
  openai: OpenAI,
  expert: ExpertResponse
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

  const completion = await safeChatCompletion(openai, {
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are an uncertainty analyst. Decompose expert confidence into structured uncertainty. Return valid JSON only.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 500
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return { overall_confidence: expert.confidence, confidence_by_claim: [], conditional_confidence: [], key_assumptions: [] };
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);

  return {
    overall_confidence: parsed.overall_confidence ?? expert.confidence,
    confidence_by_claim: Array.isArray(parsed.confidence_by_claim) ? parsed.confidence_by_claim : [],
    conditional_confidence: Array.isArray(parsed.conditional_confidence) ? parsed.conditional_confidence : [],
    key_assumptions: Array.isArray(parsed.key_assumptions) ? parsed.key_assumptions : []
  };
}
