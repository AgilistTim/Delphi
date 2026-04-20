import { ContrarianResponse, ContrarianResponseSchema, RoundSynthesis, ReasoningStressTests } from '../types/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { invokeModel, parseJsonFromText } from '../llm/invoke.js';
import type { CostTracker } from '../utils/cost-tracker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FORBIDDEN_HEDGES = ['might', 'could', 'perhaps', 'possibly', 'maybe', 'potentially'];
const MAX_WORDS_PER_TEST = 15;

export class ContrarianAgent {
  private agentId: string;
  private promptTemplate: string;
  private costTracker: CostTracker | undefined;

  constructor(costTracker?: CostTracker) {
    this.agentId = uuidv4();
    this.costTracker = costTracker;
    this.promptTemplate = readFileSync(
      join(__dirname, '../prompts/contrarian_prompt.md'),
      'utf-8'
    );
  }

  async generateResponse(
    synthesis: RoundSynthesis,
    dominantClusters: string[]
  ): Promise<ContrarianResponse> {
    try {
      const synthesisContext = this.formatSynthesisContext(synthesis, dominantClusters);

      const systemPrompt = this.promptTemplate
        .replace('{{SYNTHESIS_CONTEXT}}', synthesisContext)
        .replace(/\{\{AGENT_ID\}\}/g, this.agentId);

      const userMessage = `Generate exactly four epistemic stress tests for the reasoning in this synthesis. Each test must be ≤15 words, with no hedging language. Return valid JSON.`;

      const result = await invokeModel({
        tier: 'default',
        label: 'contrarian',
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        maxTokens: 400,
        temperature: 0.9,
        round: synthesis.round_number,
        agentId: this.agentId,
        costTracker: this.costTracker
      });

      if (!result.text) throw new Error('No response content received from Anthropic');

      let parsedResponse: ContrarianResponse;
      const rawResponse = parseJsonFromText<any>(result.text);
      if (rawResponse) {
        rawResponse.agent_id = this.agentId;
        if (rawResponse.reasoning_stress_tests) {
          rawResponse.reasoning_stress_tests = this.validateAndFixStressTests(
            rawResponse.reasoning_stress_tests
          );
        }
        parsedResponse = ContrarianResponseSchema.parse(rawResponse);
      } else {
        console.warn('Contrarian returned non-JSON; extracting from plain text.');
        parsedResponse = this.parseFromPlainText(result.text);
      }

      console.log(`[Contrarian] Generated 4 epistemic stress tests`);
      this.logStressTests(parsedResponse.reasoning_stress_tests);
      return parsedResponse;
    } catch (error) {
      console.error('Contrarian agent error:', error);
      throw new Error(
        `Contrarian agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private validateAndFixStressTests(tests: ReasoningStressTests): ReasoningStressTests {
    const fixTest = (test: string): string => {
      let fixed = test;
      for (const hedge of FORBIDDEN_HEDGES) {
        const regex = new RegExp(`\\b${hedge}\\b`, 'gi');
        fixed = fixed.replace(regex, '');
      }
      fixed = fixed.replace(/\s+/g, ' ').trim();
      const words = fixed.split(' ');
      if (words.length > MAX_WORDS_PER_TEST) {
        fixed = words.slice(0, MAX_WORDS_PER_TEST).join(' ');
        if (!fixed.endsWith('.')) fixed += '.';
      }
      return fixed;
    };

    return {
      lossy_simplification: fixTest(tests.lossy_simplification),
      context_flip: fixTest(tests.context_flip),
      incentive_misalignment: fixTest(tests.incentive_misalignment),
      second_order_failure: fixTest(tests.second_order_failure)
    };
  }

  private parseFromPlainText(content: string): ContrarianResponse {
    const lines = content.split('\n').filter((line) => line.trim());
    const extractTest = (label: string): string => {
      const regex = new RegExp(`${label}[:\\s]+(.+)`, 'i');
      for (const line of lines) {
        const match = line.match(regex);
        if (match) return match[1].trim();
      }
      return 'Unable to extract stress test.';
    };

    const stressTests: ReasoningStressTests = {
      lossy_simplification: extractTest('SIMPLIFICATION|lossy_simplification'),
      context_flip: extractTest('CONTEXT_FLIP|context_flip'),
      incentive_misalignment: extractTest('INCENTIVES|incentive_misalignment'),
      second_order_failure: extractTest('SECOND_ORDER|second_order_failure')
    };

    return {
      reasoning_stress_tests: this.validateAndFixStressTests(stressTests),
      agent_id: this.agentId
    };
  }

  private logStressTests(tests: ReasoningStressTests): void {
    console.log(`   - Simplification: ${tests.lossy_simplification}`);
    console.log(`   - Context Flip: ${tests.context_flip}`);
    console.log(`   - Incentives: ${tests.incentive_misalignment}`);
    console.log(`   - Second-Order: ${tests.second_order_failure}`);
  }

  private formatSynthesisContext(synthesis: RoundSynthesis, dominantClusters: string[]): string {
    let context = `## Round ${synthesis.round_number} Synthesis\n\n`;
    context += `**Consensus Areas:**\n${synthesis.consensus_areas.map((area) => `- ${area}`).join('\n')}\n\n`;
    context += `**Divergence Areas:**\n${synthesis.divergence_areas.map((area) => `- ${area}`).join('\n')}\n\n`;
    context += `**Dominant Clusters:**\n${dominantClusters.map((cluster) => `- ${cluster}`).join('\n')}\n\n`;
    context += `**Average Confidence:** ${synthesis.average_confidence.toFixed(1)}/10\n\n`;
    context += `**Key Insights:**\n${synthesis.key_insights.map((insight) => `- ${insight}`).join('\n')}\n\n`;

    if (synthesis.clusters.length > 0) {
      context += `**Expert Clusters:**\n`;
      synthesis.clusters.forEach((cluster, index) => {
        context += `${index + 1}. **${cluster.theme}** (${cluster.expert_ids.length} experts, confidence: ${cluster.confidence_range[0]}-${cluster.confidence_range[1]})\n`;
        context += `   Positions: ${cluster.positions.join('; ')}\n\n`;
      });
    }

    return context;
  }

  getId(): string {
    return this.agentId;
  }
}
