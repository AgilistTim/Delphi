import OpenAI from 'openai';
import { PerplexityTool } from '../tools/perplexity.js';
import { ContrarianResponse, ContrarianResponseSchema, RoundSynthesis } from '../types/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeCitations } from '../utils/citation-sanitize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ContrarianAgent {
  private openai: OpenAI;
  private perplexity: PerplexityTool;
  private agentId: string;
  private promptTemplate: string;

  constructor(
    openaiClient: OpenAI,
    perplexityTool: PerplexityTool
  ) {
    this.openai = openaiClient;
    this.perplexity = perplexityTool;
    this.agentId = uuidv4();
    
    // Load prompt template
    this.promptTemplate = readFileSync(
      join(__dirname, '../prompts/contrarian_prompt.md'),
      'utf-8'
    );
  }

  /**
   * Generate contrarian response to challenge emerging consensus
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
        .replace('{{AGENT_ID}}', this.agentId);

      const userMessage = `Challenge the emerging consensus in this synthesis. Focus on the dominant viewpoints and identify their weaknesses, blind spots, and alternative interpretations. Be constructively critical and provide counter-evidence where possible.`;

      // 1. Generate critique/alternative using OpenAI (no tool calls)
      const critiqueCompletion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage + '\n\nFirst, summarize your critique and alternative framework. Do not cite sources yet.' }
        ],
        temperature: 0.8,
        max_tokens: 600
      });
      const critiqueContext = critiqueCompletion.choices[0]?.message?.content || '';

      // 2. Now allow tool call for counter-evidence/citations if needed
      const contrarianPrompt = userMessage + `\n\nYour critique/alternative:\n${critiqueContext}\n\nIf you need to cite counter-evidence or require web/academic/recent research, use the search_counter_evidence tool.`;

      const searchFunction = {
        type: 'function' as const,
        function: {
          name: 'search_counter_evidence',
          description: 'Search for information that challenges or contradicts the emerging consensus',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query to find counter-evidence or alternative perspectives'
              },
              focus: {
                type: 'string',
                enum: ['failures', 'risks', 'alternatives', 'criticisms', 'contradictions'],
                description: 'What type of counter-evidence to focus on'
              }
            },
            required: ['query']
          }
        }
      };

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contrarianPrompt }
        ],
        tools: [searchFunction],
        tool_choice: 'auto',
        temperature: 0.8,
        max_tokens: 1500
      });

      let finalResponse = completion.choices[0]?.message;

      // Only call Perplexity if the contrarian requests a search (tool call)
      if (finalResponse?.tool_calls) {
        const toolCallResults = [];
        for (const toolCall of finalResponse.tool_calls) {
          if (toolCall.function?.name === 'search_counter_evidence') {
            const args = JSON.parse(toolCall.function.arguments);
            console.log(`[Contrarian] Searching for counter-evidence (Perplexity): ${args.query}`);
            try {
              const contrarianQuery = this.enhanceQueryForCounterEvidence(args.query, args.focus);
              const searchResult = await this.perplexity.search({
                query: contrarianQuery,
                searchContextSize: 'low' // Use low context for cost control
              });
              toolCallResults.push({
                tool_call_id: toolCall.id,
                role: 'tool' as const,
                content: JSON.stringify({
                  content: searchResult.content,
                  citations: searchResult.citations,
                  searchResults: searchResult.searchResults,
                  focus: args.focus
                })
              });
            } catch (error) {
              console.error(`Counter-evidence search failed for ${args.query}:`, error);
              toolCallResults.push({
                tool_call_id: toolCall.id,
                role: 'tool' as const,
                content: JSON.stringify({
                  error: 'Search failed',
                  message: error instanceof Error ? error.message : 'Unknown error'
                })
              });
            }
          }
        }
        // Get the final contrarian response after tool calls
        const followUpCompletion = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: contrarianPrompt },
            finalResponse,
            ...toolCallResults
          ],
          temperature: 0.8,
          max_tokens: 1500
        });
        finalResponse = followUpCompletion.choices[0]?.message;
      }

      const responseContent = finalResponse?.content;
      if (!responseContent) {
        throw new Error('No response content received from OpenAI');
      }

      // Parse the JSON response
      let parsedResponse: any;
      try {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : responseContent;
        parsedResponse = JSON.parse(jsonString);
        if (Array.isArray(parsedResponse.counter_evidence)) {
          parsedResponse.counter_evidence = sanitizeCitations(parsedResponse.counter_evidence);
        }
      } catch (error) {
        console.error('Failed to parse contrarian JSON response:', responseContent);
        throw new Error(`Failed to parse contrarian response as JSON: ${error}`);
      }

      parsedResponse.agent_id = this.agentId;
      const validatedResponse = ContrarianResponseSchema.parse(parsedResponse);
      console.log(`[Contrarian] Generated critique with ${validatedResponse.blind_spots.length} blind spots identified`);
      return validatedResponse;
    } catch (error) {
      console.error('Contrarian agent error:', error);
      throw new Error(`Contrarian agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
   * Enhance search query to find counter-evidence
   */
  private enhanceQueryForCounterEvidence(query: string, focus?: string): string {
    const prefixes = {
      failures: ['failures of', 'problems with', 'when fails', 'unsuccessful'],
      risks: ['risks of', 'dangers of', 'downsides of', 'negative effects'],
      alternatives: ['alternatives to', 'instead of', 'different approach'],
      criticisms: ['criticism of', 'critique of', 'arguments against'],
      contradictions: ['contradicts', 'disputes', 'challenges', 'refutes']
    };

    if (focus && prefixes[focus as keyof typeof prefixes]) {
      const focusPrefixes = prefixes[focus as keyof typeof prefixes];
      const randomPrefix = focusPrefixes[Math.floor(Math.random() * focusPrefixes.length)];
      return `${randomPrefix} ${query}`;
    }

    // Default: add some contrarian keywords
    const contrarianTerms = ['criticism', 'problems', 'limitations', 'failures', 'controversy'];
    const randomTerm = contrarianTerms[Math.floor(Math.random() * contrarianTerms.length)];
    return `${query} ${randomTerm}`;
  }

  /**
   * Get agent ID
   */
  getId(): string {
    return this.agentId;
  }
} 