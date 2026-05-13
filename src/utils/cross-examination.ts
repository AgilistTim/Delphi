import { ExpertResponse, RoundSynthesis, CrossExamination } from '../types/index.js';
import { invokeModel } from '../llm/invoke.js';
import type { CostTracker } from './cost-tracker.js';

export async function runCrossExamination(
  synthesis: RoundSynthesis,
  expertResponses: ExpertResponse[],
  roundNumber: number,
  costTracker?: CostTracker
): Promise<CrossExamination[]> {
  const examinations: CrossExamination[] = [];

  const disagreementPair = findSharpestDisagreement(synthesis, expertResponses);
  if (!disagreementPair) return examinations;

  const [expertA, expertB] = disagreementPair;

  const challengeAtoB = await generateChallenge(expertA, expertB, roundNumber, costTracker);
  const responseBtoA = await generateCrossResponse(expertB, challengeAtoB, roundNumber, costTracker);

  examinations.push({
    examiner_id: expertA.agent_id,
    examiner_role: expertA.expertise_area,
    respondent_id: expertB.agent_id,
    respondent_role: expertB.expertise_area,
    challenge: challengeAtoB,
    response: responseBtoA,
    round_number: roundNumber
  });

  const challengeBtoA = await generateChallenge(expertB, expertA, roundNumber, costTracker);
  const responseAtoB = await generateCrossResponse(expertA, challengeBtoA, roundNumber, costTracker);

  examinations.push({
    examiner_id: expertB.agent_id,
    examiner_role: expertB.expertise_area,
    respondent_id: expertA.agent_id,
    respondent_role: expertA.expertise_area,
    challenge: challengeBtoA,
    response: responseAtoB,
    round_number: roundNumber
  });

  return examinations;
}

function findSharpestDisagreement(
  synthesis: RoundSynthesis,
  expertResponses: ExpertResponse[]
): [ExpertResponse, ExpertResponse] | null {
  if (synthesis.clusters.length < 2 || expertResponses.length < 2) return null;

  const sortedClusters = [...synthesis.clusters].sort(
    (a, b) => b.expert_ids.length - a.expert_ids.length
  );

  const clusterA = sortedClusters[0];
  const clusterB = sortedClusters[1];

  const expertA = expertResponses.find((e) => clusterA.expert_ids.includes(e.agent_id));
  const expertB = expertResponses.find((e) => clusterB.expert_ids.includes(e.agent_id));

  if (!expertA || !expertB) return null;
  return [expertA, expertB];
}

async function generateChallenge(
  examiner: ExpertResponse,
  respondent: ExpertResponse,
  round: number,
  costTracker?: CostTracker
): Promise<string> {
  try {
    const result = await invokeModel({
      tier: 'default',
      label: 'cross_exam',
      system: `You are ${examiner.expertise_area}. You have read another expert's position and must pose a direct, specific challenge to their reasoning. Be respectful but incisive. Focus on the weakest point of their argument. Keep your challenge to 2-3 sentences.`,
      messages: [
        {
          role: 'user',
          content: `Your position: "${examiner.position}"\n\nTheir position (${respondent.expertise_area}): "${respondent.position}"\n\nTheir reasoning: "${respondent.reasoning.substring(0, 500)}"\n\nPose your most pointed challenge to their reasoning.`
        }
      ],
      maxTokens: 500,
      temperature: 0.7,
      round,
      costTracker
    });
    return result.text || 'No challenge generated.';
  } catch {
    return 'Cross-examination challenge generation failed.';
  }
}

async function generateCrossResponse(
  respondent: ExpertResponse,
  challenge: string,
  round: number,
  costTracker?: CostTracker
): Promise<string> {
  try {
    const result = await invokeModel({
      tier: 'default',
      label: 'cross_exam',
      system: `You are ${respondent.expertise_area}. Another expert has directly challenged your position. Respond to their specific challenge. You may defend, concede partially, or refine your position. Be direct and evidence-based. Keep your response to 2-3 sentences.`,
      messages: [
        {
          role: 'user',
          content: `Your position: "${respondent.position}"\n\nChallenge from another expert: "${challenge}"\n\nRespond directly to this challenge.`
        }
      ],
      maxTokens: 500,
      temperature: 0.7,
      round,
      costTracker
    });
    return result.text || 'No response generated.';
  } catch {
    return 'Cross-examination response generation failed.';
  }
}
