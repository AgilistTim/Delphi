import { QuestionAnalysis } from '../types/index.js';
import { invokeModel, parseJsonFromText } from '../llm/invoke.js';
import type { CostTracker } from './cost-tracker.js';

const REFINER_SYSTEM_PROMPT = `You are a Question Refiner for a Delphi consensus process. Your job is to analyze the user's raw question and extract structured metadata that will help the expert panel provide better, more targeted responses.

Analyze the question and produce a JSON object with the following fields:

1. **decision_type**: What kind of decision is this? One of: strategy, policy, hiring, product, risk, operations, research, other
2. **time_horizon**: What timeframe is relevant? One of: immediate (days), short_term (weeks-months), medium_term (1-2 years), long_term (3+ years), unknown
3. **primary_objective**: What is the main goal? One of: speed, accuracy, innovation, cost, safety, quality, multiple, unclear
4. **constraints**: List any explicit or implicit constraints (budget, regulation, capacity, brand, ethics, technical, etc.)
5. **unknowns**: List key variables that would materially change the answer if known
6. **inferred_assumptions**: List assumptions the question seems to make that may not be valid
7. **ambiguity_score**: Rate 0.0-1.0 how vague/ambiguous the question is (0 = very clear, 1 = very vague)
8. **refined_question**: Optionally provide a clearer version of the question that addresses ambiguities

Be concise. Each constraint/unknown/assumption should be one short sentence.

Output valid JSON only, no markdown.`;

export async function refineQuestion(
  question: string,
  costTracker?: CostTracker
): Promise<QuestionAnalysis> {
  const userMessage = `Analyze this question for a Delphi expert panel:\n\n"${question}"`;

  const result = await invokeModel({
    tier: 'light',
    label: 'refiner',
    system: REFINER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: 600,
    temperature: 0.3,
    costTracker
  });

  const parsed = parseJsonFromText<any>(result.text);
  if (!parsed) return getDefaultAnalysis(question);

  return {
    original_question: question,
    decision_type: parsed.decision_type || 'other',
    time_horizon: parsed.time_horizon || 'unknown',
    primary_objective: parsed.primary_objective || 'unclear',
    constraints: Array.isArray(parsed.constraints) ? parsed.constraints : [],
    unknowns: Array.isArray(parsed.unknowns) ? parsed.unknowns : [],
    inferred_assumptions: Array.isArray(parsed.inferred_assumptions)
      ? parsed.inferred_assumptions
      : [],
    ambiguity_score: typeof parsed.ambiguity_score === 'number' ? parsed.ambiguity_score : 0.5,
    refined_question: parsed.refined_question
  };
}

function getDefaultAnalysis(question: string): QuestionAnalysis {
  return {
    original_question: question,
    decision_type: 'other',
    time_horizon: 'unknown',
    primary_objective: 'unclear',
    constraints: [],
    unknowns: [],
    inferred_assumptions: [],
    ambiguity_score: 0.5
  };
}

export function formatQuestionAnalysisForExperts(analysis: QuestionAnalysis): string {
  const parts: string[] = [];

  parts.push(`## Question Analysis (Auto-Generated)`);
  parts.push(`**Decision Type:** ${analysis.decision_type}`);
  parts.push(`**Time Horizon:** ${analysis.time_horizon}`);
  parts.push(`**Primary Objective:** ${analysis.primary_objective}`);

  if (analysis.constraints.length > 0) {
    parts.push(`\n**Identified Constraints:**`);
    analysis.constraints.forEach((c) => parts.push(`- ${c}`));
  }

  if (analysis.unknowns.length > 0) {
    parts.push(`\n**Key Unknowns (variables that would change the answer):**`);
    analysis.unknowns.forEach((u) => parts.push(`- ${u}`));
  }

  if (analysis.inferred_assumptions.length > 0) {
    parts.push(`\n**Inferred Assumptions (may need validation):**`);
    analysis.inferred_assumptions.forEach((a) => parts.push(`- ${a}`));
  }

  if (analysis.ambiguity_score > 0.6) {
    parts.push(
      `\n⚠️ **Note:** This question has high ambiguity (${(analysis.ambiguity_score * 100).toFixed(
        0
      )}%). Consider addressing the unknowns and assumptions in your response.`
    );
  }

  return parts.join('\n');
}
