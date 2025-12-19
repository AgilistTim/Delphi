import OpenAI from 'openai';
import { safeChatCompletion } from '../utils/openai-helpers.js';
import { PerplexityTool } from '../tools/perplexity.js';
import { ContrarianResponse, ContrarianResponseSchema, RoundSynthesis, ReasoningStressTests } from '../types/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Forbidden hedging words that indicate weak stress tests
const FORBIDDEN_HEDGES = ['might', 'could', 'perhaps', 'possibly', 'maybe', 'potentially'];
const MAX_WORDS_PER_TEST = 15;

export class ContrarianAgent {
  private openai: OpenAI;
  private agentId: string;
  private promptTemplate: string;

  constructor(
    openaiClient: OpenAI,
    _perplexityTool: PerplexityTool // Kept in signature for backward compatibility
  ) {
    this.openai = openaiClient;
    this.agentId = uuidv4();
    
    // Load prompt template
    this.promptTemplate = readFileSync(
      join(__dirname, '../prompts/contrarian_prompt.md'),
      'utf-8'
    );
  }

  /**
   * Generate epistemic stress tests to challenge reasoning quality
   * Returns four short, provocative statements that attack reasoning, not conclusions
   */
  async generateResponse(
    synthesis: RoundSynthesis,
    dominantClusters: string[]
  ): Promise<ContrarianResponse> {
    try {
      // Prepare synthesis context for the prompt
      const synthesisContext = this.formatSynthesisContext(synthesis, dominantClusters);
      
      const systemPrompt = this.promptTemplate
        .replace('{{SYNTHESIS_CONTEXT}}', synthesisContext)
        .replace(/\{\{AGENT_ID\}\}/g, this.agentId);

      const userMessage = `Generate exactly four epistemic stress tests for the reasoning in this synthesis. Each test must be ≤15 words, with no hedging language. Return valid JSON.`;

      // Single API call with low token limit to enforce brevity
      const completion = await safeChatCompletion(this.openai, {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.9, // Higher temperature for more provocative outputs
        max_tokens: 300 // Hard cap to enforce brevity
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response content received from OpenAI');
      }

      // Parse the JSON response
      let parsedResponse: ContrarianResponse;
      try {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : responseContent;
        const rawResponse = JSON.parse(jsonString);
        
        // Ensure agent_id is set
        rawResponse.agent_id = this.agentId;
        
        // Validate and potentially fix the stress tests
        if (rawResponse.reasoning_stress_tests) {
          rawResponse.reasoning_stress_tests = this.validateAndFixStressTests(rawResponse.reasoning_stress_tests);
        }
        
        parsedResponse = ContrarianResponseSchema.parse(rawResponse);
      } catch (error) {
        console.error('Failed to parse contrarian JSON response:', responseContent);
        // If parsing fails, try to extract stress tests from plain text
        parsedResponse = this.parseFromPlainText(responseContent);
      }

      console.log(`[Contrarian] Generated 4 epistemic stress tests`);
      this.logStressTests(parsedResponse.reasoning_stress_tests);
      
      return parsedResponse;
    } catch (error) {
      console.error('Contrarian agent error:', error);
      throw new Error(`Contrarian agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate stress tests and fix common issues (hedging, length)
   */
  private validateAndFixStressTests(tests: ReasoningStressTests): ReasoningStressTests {
    const fixTest = (test: string): string => {
      // Remove hedging words
      let fixed = test;
      for (const hedge of FORBIDDEN_HEDGES) {
        const regex = new RegExp(`\\b${hedge}\\b`, 'gi');
        fixed = fixed.replace(regex, '');
      }
      // Clean up double spaces
      fixed = fixed.replace(/\s+/g, ' ').trim();
      
      // Truncate if too long (keep first 15 words)
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

  /**
   * Parse stress tests from plain text if JSON parsing fails
   */
  private parseFromPlainText(content: string): ContrarianResponse {
    const lines = content.split('\n').filter(line => line.trim());
    
    // Try to extract labeled lines
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

  /**
   * Log stress tests for debugging
   */
  private logStressTests(tests: ReasoningStressTests): void {
    console.log(`   - Simplification: ${tests.lossy_simplification}`);
    console.log(`   - Context Flip: ${tests.context_flip}`);
    console.log(`   - Incentives: ${tests.incentive_misalignment}`);
    console.log(`   - Second-Order: ${tests.second_order_failure}`);
  }

  /**
   * Format synthesis context for the contrarian prompt
   */
  private formatSynthesisContext(synthesis: RoundSynthesis, dominantClusters: string[]): string {
    let context = `## Round ${synthesis.round_number} Synthesis\n\n`;
    
    context += `**Consensus Areas:**\n${synthesis.consensus_areas.map(area => `- ${area}`).join('\n')}\n\n`;
    
    context += `**Divergence Areas:**\n${synthesis.divergence_areas.map(area => `- ${area}`).join('\n')}\n\n`;
    
    context += `**Dominant Clusters:**\n${dominantClusters.map(cluster => `- ${cluster}`).join('\n')}\n\n`;
    
    context += `**Average Confidence:** ${synthesis.average_confidence.toFixed(1)}/10\n\n`;
    
    context += `**Key Insights:**\n${synthesis.key_insights.map(insight => `- ${insight}`).join('\n')}\n\n`;

    if (synthesis.clusters.length > 0) {
      context += `**Expert Clusters:**\n`;
      synthesis.clusters.forEach((cluster, index) => {
        context += `${index + 1}. **${cluster.theme}** (${cluster.expert_ids.length} experts, confidence: ${cluster.confidence_range[0]}-${cluster.confidence_range[1]})\n`;
        context += `   Positions: ${cluster.positions.join('; ')}\n\n`;
      });
    }

    return context;
  }

  /**
   * Get agent ID
   */
  getId(): string {
    return this.agentId;
  }
}
