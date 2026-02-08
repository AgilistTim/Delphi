import OpenAI from 'openai';
import { safeChatCompletion } from './openai-helpers.js';
import {
  DecisionCanvas,
  OppositionalCase,
  RegimeSplitAnalysis,
  RegimeSignals,
  CounterfactualRiskAnalysis,
  AssumptionExposure
} from '../types/index.js';

export async function generateDecisionCanvas(
  openai: OpenAI,
  consensusPosition: string,
  oppositionalCase: OppositionalCase | undefined,
  regimeSplit: RegimeSplitAnalysis | undefined,
  _regimeSignals: RegimeSignals | undefined,
  counterfactualRisk: CounterfactualRiskAnalysis | undefined,
  assumptionExposures: AssumptionExposure[] | undefined
): Promise<DecisionCanvas> {
  const prompt = `You are synthesizing the full output of a Delphi consensus analysis into a Decision Canvas - an actionable summary that helps the reader act on the analysis.

CONSENSUS POSITION:
${consensusPosition}

${oppositionalCase ? `OPPOSITIONAL CASE:
Position: ${oppositionalCase.opposite_position}
Argument: ${oppositionalCase.argument}
Outperformance scenario: ${oppositionalCase.outperformance_scenario}` : ''}

${regimeSplit ? `REGIME SPLIT:
Consensus regime: scarce=${regimeSplit.consensus_regime.scarce_resource}, winner=${regimeSplit.consensus_regime.winning_organization}
Oppositional regime: scarce=${regimeSplit.oppositional_regime.scarce_resource}, winner=${regimeSplit.oppositional_regime.winning_organization}` : ''}

${counterfactualRisk ? `COUNTERFACTUAL RISK:
Plausible failure: ${counterfactualRisk.plausible_failure}
Early warning: ${counterfactualRisk.early_warning_signal}` : ''}

${assumptionExposures ? `ASSUMPTION EXPOSURES:
${assumptionExposures.map(ae => `- ${ae.expert_label}: ${ae.failed_assumption}`).join('\n')}` : ''}

Generate a JSON Decision Canvas:
{
  "consensus_action": "Specific recommended action if the consensus view is correct (1-2 sentences)",
  "oppositional_action": "Specific recommended action if the oppositional view is correct (1-2 sentences)",
  "reversibility_assessment": "How hard is it to change course if the wrong path is chosen? (1-2 sentences)",
  "optionality_analysis": "Which choice preserves the most future options? (1-2 sentences)",
  "time_pressure": "When does inaction become a decision? What is the cost of waiting? (1-2 sentences)",
  "monitoring_plan": ["Signal 1 to watch", "Signal 2 to watch", "Signal 3 to watch", "When to reassess"]
}`;

  try {
    const completion = await safeChatCompletion(openai, {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a strategic decision analyst. Synthesize complex analysis into actionable guidance. Return valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 800
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return getFallbackCanvas(consensusPosition);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);

    return {
      consensus_action: parsed.consensus_action || 'Act on the consensus position with standard risk management.',
      oppositional_action: parsed.oppositional_action || 'Hedge against the oppositional scenario.',
      reversibility_assessment: parsed.reversibility_assessment || 'Reversibility not assessed.',
      optionality_analysis: parsed.optionality_analysis || 'Optionality not assessed.',
      time_pressure: parsed.time_pressure || 'No immediate time pressure identified.',
      monitoring_plan: Array.isArray(parsed.monitoring_plan) ? parsed.monitoring_plan : ['Monitor regime signals quarterly']
    };
  } catch (error) {
    console.warn('Decision canvas generation failed:', error);
    return getFallbackCanvas(consensusPosition);
  }
}

function getFallbackCanvas(consensusPosition: string): DecisionCanvas {
  return {
    consensus_action: `Proceed based on the consensus: ${consensusPosition.substring(0, 100)}...`,
    oppositional_action: 'Maintain optionality by hedging against the oppositional scenario.',
    reversibility_assessment: 'Reversibility assessment requires manual evaluation of specific commitments.',
    optionality_analysis: 'Delay irreversible commitments until regime signals clarify.',
    time_pressure: 'Evaluate whether the cost of waiting exceeds the cost of acting on incomplete information.',
    monitoring_plan: ['Review regime signals quarterly', 'Reassess if any assumption exposure materialises']
  };
}
