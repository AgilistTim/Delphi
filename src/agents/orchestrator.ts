import OpenAI from 'openai';
import { safeChatCompletion } from '../utils/openai-helpers.js';
import { 
  ExpertResponse, 
  ContrarianResponse, 
  RoundSynthesis, 
  ExpertCluster, 
  Citation 
} from '../types/index.js';

export class OrchestratorAgent {
  private openai: OpenAI;

  constructor(openaiClient: OpenAI) {
    this.openai = openaiClient;
  }

  /**
   * Synthesize expert responses into a round summary
   */
  async synthesizeRound(
    roundNumber: number,
    expertResponses: ExpertResponse[],
    contrarianResponses: ContrarianResponse[] = []
  ): Promise<RoundSynthesis> {
    try {
      console.log(`[Orchestrator] Synthesizing round ${roundNumber} with ${expertResponses.length} expert responses`);

      // Extract key information for synthesis
      const confidenceScores = expertResponses.map(r => r.confidence);

      // Create synthesis prompt
      const synthesisPrompt = this.createSynthesisPrompt(
        roundNumber,
        expertResponses,
        contrarianResponses
      );

      const completion = await safeChatCompletion(this.openai, {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert orchestrator in a Delphi consensus process. Your role is to synthesize diverse expert opinions into clear, structured summaries that identify areas of consensus and divergence.

You must analyze the provided expert responses and return a JSON object with the following structure:
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

Focus on identifying meaningful patterns and groupings. Be objective and accurate.`
          },
          {
            role: 'user',
            content: synthesisPrompt
          }
        ],
        temperature: 0.3, // Lower temperature for consistent synthesis
        max_tokens: 2000
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No synthesis response received from OpenAI');
      }

      // Parse the synthesis response
      let synthesisData: any;
      try {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : responseContent;
        synthesisData = JSON.parse(jsonString);
      } catch (error) {
        console.error('Failed to parse synthesis JSON:', responseContent);
        throw new Error(`Failed to parse synthesis response: ${error}`);
      }

      // Calculate statistics
      const averageConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;

      // Build the synthesis object
      const synthesis: RoundSynthesis = {
        round_number: roundNumber,
        clusters: this.processClusters(synthesisData.clusters || [], expertResponses),
        consensus_areas: synthesisData.consensus_areas || [],
        divergence_areas: synthesisData.divergence_areas || [],
        average_confidence: averageConfidence,
        participation_count: expertResponses.length,
        key_insights: synthesisData.key_insights || []
      };

      console.log(`[Orchestrator] Synthesis complete: ${synthesis.clusters.length} clusters, ${synthesis.consensus_areas.length} consensus areas`);

      return synthesis;

    } catch (error) {
      console.error('Orchestrator synthesis error:', error);
      throw new Error(`Failed to synthesize round: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create the synthesis prompt from expert responses
   */
  private createSynthesisPrompt(
    roundNumber: number,
    expertResponses: ExpertResponse[],
    contrarianResponses: ContrarianResponse[]
  ): string {
    let prompt = `## Round ${roundNumber} Expert Responses Analysis\n\n`;

    prompt += `Please synthesize the following ${expertResponses.length} expert responses:\n\n`;

    expertResponses.forEach((response, index) => {
      prompt += `### Expert ${index + 1} (${response.expertise_area})\n`;
      prompt += `**Position:** ${response.position}\n`;
      prompt += `**Confidence:** ${response.confidence}/10\n`;
      prompt += `**Key Reasoning:** ${response.reasoning.substring(0, 300)}${response.reasoning.length > 300 ? '...' : ''}\n`;
      prompt += `**Sources:** ${response.sources.length} citations\n\n`;
    });

    if (contrarianResponses.length > 0) {
      prompt += `## Contrarian Challenges:\n\n`;
      contrarianResponses.forEach((response, index) => {
        prompt += `### Contrarian ${index + 1}\n`;
        prompt += `**Critique:** ${response.critique.substring(0, 200)}${response.critique.length > 200 ? '...' : ''}\n`;
        prompt += `**Alternative Framework:** ${response.alternative_framework.substring(0, 200)}${response.alternative_framework.length > 200 ? '...' : ''}\n`;
        prompt += `**Blind Spots:** ${response.blind_spots.join(', ')}\n\n`;
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

  /**
   * Process and validate clusters from synthesis
   */
  private processClusters(rawClusters: any[], expertResponses: ExpertResponse[]): ExpertCluster[] {
    const clusters: ExpertCluster[] = [];

    rawClusters.forEach((rawCluster) => {
      // Validate cluster data
      if (!rawCluster.theme || !rawCluster.expert_ids || !Array.isArray(rawCluster.expert_ids)) {
        console.warn('Invalid cluster data, skipping:', rawCluster);
        return;
      }

      // Find matching expert responses
      const clusterExperts = expertResponses.filter(response => 
        rawCluster.expert_ids.includes(response.agent_id)
      );

      if (clusterExperts.length === 0) {
        console.warn('No matching experts found for cluster:', rawCluster.theme);
        return;
      }

      // Calculate confidence range
      const confidenceScores = clusterExperts.map(expert => expert.confidence);
      const minConfidence = Math.min(...confidenceScores);
      const maxConfidence = Math.max(...confidenceScores);

      // Collect supporting sources
      const supportingSources: Citation[] = [];
      clusterExperts.forEach(expert => {
        expert.sources.forEach(source => {
          // Avoid duplicates
          if (!supportingSources.some(existing => existing.url === source.url)) {
            supportingSources.push({
              title: source.title,
              url: source.url,
              date: source.date,
              relevance: source.relevance || 'Supporting evidence'
            });
          }
        });
      });

      const cluster: ExpertCluster = {
        theme: rawCluster.theme,
        positions: rawCluster.positions || clusterExperts.map(expert => expert.position),
        expert_ids: rawCluster.expert_ids,
        confidence_range: [minConfidence, maxConfidence],
        supporting_sources: supportingSources.slice(0, 10) // Limit to top 10 sources
      };

      clusters.push(cluster);
    });

    return clusters;
  }

  /**
   * Identify dominant clusters for contrarian targeting
   */
  identifyDominantClusters(synthesis: RoundSynthesis): string[] {
    if (synthesis.clusters.length === 0) {
      return [];
    }

    // Sort clusters by size (number of experts) and confidence
    const sortedClusters = synthesis.clusters.sort((a, b) => {
      const sizeA = a.expert_ids.length;
      const sizeB = b.expert_ids.length;
      
      if (sizeA !== sizeB) {
        return sizeB - sizeA; // Larger clusters first
      }
      
      // If same size, sort by average confidence
      const avgConfidenceA = (a.confidence_range[0] + a.confidence_range[1]) / 2;
      const avgConfidenceB = (b.confidence_range[0] + b.confidence_range[1]) / 2;
      
      return avgConfidenceB - avgConfidenceA; // Higher confidence first
    });

    // Return themes of the top clusters (up to 3)
    return sortedClusters
      .slice(0, 3)
      .map(cluster => cluster.theme);
  }

  /**
   * Format synthesis for expert review in subsequent rounds
   */
  formatSynthesisForReview(synthesis: RoundSynthesis): string {
    let formatted = `## Round ${synthesis.round_number} Synthesis\n\n`;

    formatted += `**Participation:** ${synthesis.participation_count} experts\n`;
    formatted += `**Average Confidence:** ${synthesis.average_confidence.toFixed(1)}/10\n\n`;

    if (synthesis.consensus_areas.length > 0) {
      formatted += `### Areas of Consensus\n`;
      synthesis.consensus_areas.forEach(area => {
        formatted += `- ${area}\n`;
      });
      formatted += '\n';
    }

    if (synthesis.divergence_areas.length > 0) {
      formatted += `### Areas of Divergence\n`;
      synthesis.divergence_areas.forEach(area => {
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
      synthesis.key_insights.forEach(insight => {
        formatted += `- ${insight}\n`;
      });
      formatted += '\n';
    }

    return formatted;
  }
}
