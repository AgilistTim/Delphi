import {
  ExpertResponse,
  ContrarianResponse,
  RoundSynthesis,
  ExpertCluster,
  Citation
} from '../types/index.js';
import { invokeModel, parseJsonFromText } from '../llm/invoke.js';
import type { CostTracker } from '../utils/cost-tracker.js';

const ORCHESTRATOR_SYSTEM = `You are an expert orchestrator in a Delphi consensus process. Your role is to synthesise diverse expert opinions into clear, structured summaries that identify areas of consensus and divergence.

You must analyse the provided expert responses and return a JSON object with the following structure:
{
  "clusters": [
    {
      "theme": "Brief description of this cluster's perspective",
      "positions": ["Position summary 1", "Position summary 2"],
      "expert_ids": ["agent-id-1", "agent-id-2"],
      "confidence_range": [min_confidence, max_confidence],
      "supporting_sources": [{"title": "...", "url": "...", "relevance": "..."}]
    }
  ],
  "consensus_areas": ["Area of agreement 1", "Area of agreement 2"],
  "divergence_areas": ["Area of disagreement 1", "Area of disagreement 2"],
  "key_insights": ["Key insight 1", "Key insight 2", "Key insight 3"]
}

Focus on identifying meaningful patterns and groupings. Be objective and accurate. Return valid JSON only.`;

export class OrchestratorAgent {
  private costTracker: CostTracker | undefined;

  constructor(costTracker?: CostTracker) {
    this.costTracker = costTracker;
  }

  /**
   * Synthesize expert responses into a round summary.
   */
  async synthesizeRound(
    roundNumber: number,
    expertResponses: ExpertResponse[],
    contrarianResponses: ContrarianResponse[] = []
  ): Promise<RoundSynthesis> {
    try {
      console.log(
        `[Orchestrator] Synthesising round ${roundNumber} with ${expertResponses.length} expert responses`
      );

      const confidenceScores = expertResponses.map((r) => r.confidence);
      const userPrompt = this.createSynthesisPrompt(
        roundNumber,
        expertResponses,
        contrarianResponses
      );

      const result = await invokeModel({
        tier: 'heavy',
        label: 'orchestrator',
        system: ORCHESTRATOR_SYSTEM,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 4000,
        temperature: 0.3,
        round: roundNumber,
        costTracker: this.costTracker
      });

      const synthesisData = parseJsonFromText<any>(result.text, 'object');
      if (!synthesisData) {
        console.error('Failed to parse synthesis JSON:', result.text);
        throw new Error('Failed to parse synthesis response as JSON');
      }

      const averageConfidence =
        confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;

      const synthesis: RoundSynthesis = {
        round_number: roundNumber,
        clusters: this.processClusters(synthesisData.clusters || [], expertResponses),
        consensus_areas: synthesisData.consensus_areas || [],
        divergence_areas: synthesisData.divergence_areas || [],
        average_confidence: averageConfidence,
        participation_count: expertResponses.length,
        key_insights: synthesisData.key_insights || []
      };

      console.log(
        `[Orchestrator] Synthesis complete: ${synthesis.clusters.length} clusters, ${synthesis.consensus_areas.length} consensus areas`
      );

      return synthesis;
    } catch (error) {
      console.error('Orchestrator synthesis error:', error);
      throw new Error(
        `Failed to synthesize round: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private createSynthesisPrompt(
    roundNumber: number,
    expertResponses: ExpertResponse[],
    contrarianResponses: ContrarianResponse[]
  ): string {
    let prompt = `## Round ${roundNumber} Expert Responses Analysis\n\n`;
    prompt += `Please synthesize the following ${expertResponses.length} expert responses:\n\n`;

    expertResponses.forEach((response, index) => {
      prompt += `### Expert ${index + 1} (${response.expertise_area})\n`;
      prompt += `**Agent ID:** ${response.agent_id}\n`;
      prompt += `**Position:** ${response.position}\n`;
      prompt += `**Confidence:** ${response.confidence}/10\n`;
      prompt += `**Key Reasoning:** ${response.reasoning.substring(0, 300)}${
        response.reasoning.length > 300 ? '...' : ''
      }\n`;
      prompt += `**Sources:** ${response.sources.length} citations\n\n`;
    });

    if (contrarianResponses.length > 0) {
      prompt += `## Contrarian Challenges:\n\n`;
      contrarianResponses.forEach((response, index) => {
        prompt += `### Contrarian ${index + 1}\n`;
        if (response.reasoning_stress_tests) {
          const tests = response.reasoning_stress_tests;
          prompt += `**Stress Tests:**\n`;
          prompt += `- Lossy Simplification: ${tests.lossy_simplification}\n`;
          prompt += `- Context Flip: ${tests.context_flip}\n`;
          prompt += `- Incentive Misalignment: ${tests.incentive_misalignment}\n`;
          prompt += `- Second-Order Failure: ${tests.second_order_failure}\n\n`;
        }
        if (response.critique) {
          prompt += `**Critique:** ${response.critique.substring(0, 200)}${
            response.critique.length > 200 ? '...' : ''
          }\n`;
        }
        if (response.alternative_framework) {
          prompt += `**Alternative Framework:** ${response.alternative_framework.substring(
            0,
            200
          )}${response.alternative_framework.length > 200 ? '...' : ''}\n`;
        }
        if (response.blind_spots && response.blind_spots.length > 0) {
          prompt += `**Blind Spots:** ${response.blind_spots.join(', ')}\n\n`;
        }
      });
    }

    prompt += `\nAnalyze these responses and identify:\n`;
    prompt += `1. **Clusters** of similar expert positions\n`;
    prompt += `2. **Consensus areas** where experts generally agree\n`;
    prompt += `3. **Divergence areas** where experts disagree\n`;
    prompt += `4. **Key insights** that emerged from this round\n\n`;
    prompt += `Provide your analysis as valid JSON following the specified structure.`;

    return prompt;
  }

  private processClusters(rawClusters: any[], expertResponses: ExpertResponse[]): ExpertCluster[] {
    const clusters: ExpertCluster[] = [];

    rawClusters.forEach((rawCluster) => {
      if (!rawCluster.theme || !rawCluster.expert_ids || !Array.isArray(rawCluster.expert_ids)) {
        console.warn('Invalid cluster data, skipping:', rawCluster);
        return;
      }

      const clusterExperts = expertResponses.filter((response) =>
        rawCluster.expert_ids.includes(response.agent_id)
      );

      if (clusterExperts.length === 0) {
        console.warn('No matching experts found for cluster:', rawCluster.theme);
        return;
      }

      const confidenceScores = clusterExperts.map((expert) => expert.confidence);
      const minConfidence = Math.min(...confidenceScores);
      const maxConfidence = Math.max(...confidenceScores);

      const supportingSources: Citation[] = [];
      clusterExperts.forEach((expert) => {
        expert.sources.forEach((source) => {
          if (!supportingSources.some((existing) => existing.url === source.url)) {
            supportingSources.push({
              title: source.title,
              url: source.url,
              date: source.date,
              relevance: source.relevance || 'Supporting evidence'
            });
          }
        });
      });

      clusters.push({
        theme: rawCluster.theme,
        positions: rawCluster.positions || clusterExperts.map((expert) => expert.position),
        expert_ids: rawCluster.expert_ids,
        confidence_range: [minConfidence, maxConfidence],
        supporting_sources: supportingSources.slice(0, 10)
      });
    });

    return clusters;
  }

  identifyDominantClusters(synthesis: RoundSynthesis): string[] {
    if (synthesis.clusters.length === 0) return [];

    const sortedClusters = synthesis.clusters.sort((a, b) => {
      const sizeA = a.expert_ids.length;
      const sizeB = b.expert_ids.length;
      if (sizeA !== sizeB) return sizeB - sizeA;
      const avgA = (a.confidence_range[0] + a.confidence_range[1]) / 2;
      const avgB = (b.confidence_range[0] + b.confidence_range[1]) / 2;
      return avgB - avgA;
    });

    return sortedClusters.slice(0, 3).map((cluster) => cluster.theme);
  }

  formatSynthesisForReview(synthesis: RoundSynthesis): string {
    let formatted = `## Round ${synthesis.round_number} Synthesis\n\n`;
    formatted += `**Participation:** ${synthesis.participation_count} experts\n`;
    formatted += `**Average Confidence:** ${synthesis.average_confidence.toFixed(1)}/10\n\n`;

    if (synthesis.consensus_areas.length > 0) {
      formatted += `### Areas of Consensus\n`;
      synthesis.consensus_areas.forEach((area) => {
        formatted += `- ${area}\n`;
      });
      formatted += '\n';
    }

    if (synthesis.divergence_areas.length > 0) {
      formatted += `### Areas of Divergence\n`;
      synthesis.divergence_areas.forEach((area) => {
        formatted += `- ${area}\n`;
      });
      formatted += '\n';
    }

    if (synthesis.clusters.length > 0) {
      formatted += `### Expert Position Clusters\n\n`;
      synthesis.clusters.forEach((cluster, index) => {
        formatted += `**Cluster ${index + 1}: ${cluster.theme}**\n`;
        formatted += `- Experts: ${cluster.expert_ids.length}\n`;
        formatted += `- Confidence Range: ${cluster.confidence_range[0]}-${cluster.confidence_range[1]}/10\n`;
        formatted += `- Key Positions: ${cluster.positions.slice(0, 2).join('; ')}\n\n`;
      });
    }

    if (synthesis.key_insights.length > 0) {
      formatted += `### Key Insights\n`;
      synthesis.key_insights.forEach((insight) => {
        formatted += `- ${insight}\n`;
      });
      formatted += '\n';
    }

    return formatted;
  }
}
