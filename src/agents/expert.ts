import OpenAI from 'openai';
import { safeChatCompletion } from '../utils/openai-helpers.js';
import { PerplexityTool } from '../tools/perplexity.js';
import { ExpertResponse, ExpertResponseSchema, AgentConfig, DelphiPrompt } from '../types/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeCitations } from '../utils/citation-sanitize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ExpertAgent {
  private openai: OpenAI;
  private config: AgentConfig;
  private agentId: string;
  private promptTemplate: string;

  constructor(
    openaiClient: OpenAI,
    _perplexityTool: PerplexityTool, // Kept for backward compatibility; per-expert searches disabled
    config: AgentConfig
  ) {
    this.openai = openaiClient;
    this.config = config;
    this.agentId = uuidv4();
    
    // Load prompt template
    this.promptTemplate = readFileSync(
      join(__dirname, '../prompts/expert_prompt.md'),
      'utf-8'
    );
  }

  /**
   * Generate expert response to a Delphi prompt
   */
  async generateResponse(
    prompt: DelphiPrompt,
    synthesisContext?: string,
    _roundNumber: number = 1
  ): Promise<ExpertResponse> {
    try {
      // Prepare the system prompt with agent-specific information
      const systemPrompt = this.promptTemplate
        .replace('{{ROLE}}', this.config.role)
        .replace('{{EXPERTISE_AREAS}}', this.config.expertise_areas.join(', '))
        .replace('{{PERSPECTIVE}}', this.config.perspective)
        .replace('{{AGENT_ID}}', this.agentId);

      // Prepare the user message
      let userMessage = `Question: ${prompt.question}\n\n`;
      
      if (prompt.context) {
        userMessage += `Context: ${prompt.context}\n\n`;
      }

      if (prompt.constraints && prompt.constraints.length > 0) {
        userMessage += `Constraints: ${prompt.constraints.join(', ')}\n\n`;
      }

      if (synthesisContext) {
        userMessage += `Previous Round Synthesis:\n${synthesisContext}\n\n`;
        userMessage += `Please refine or update your position based on this synthesis. `;
      }

      userMessage += `Please provide your expert analysis as a ${this.config.role} with expertise in ${this.config.expertise_areas.join(', ')}.`;

      // 1. Get background/context from OpenAI (no tool calls)
      const backgroundCompletion = await safeChatCompletion(this.openai, {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage + '\n\nSummarize the background and key considerations for this question. Do not cite sources.' }
        ],
        temperature: 0.5,
        max_tokens: 600
      });
      const backgroundContext = backgroundCompletion.choices[0]?.message?.content || '';

      // 2. Now ask for the expert's position
      // NOTE: Per-expert Perplexity searches are disabled by default to reduce API load.
      // Experts should rely on the shared Phase 0 Perplexity research provided in the context.
      // This significantly reduces Perplexity API calls and avoids rate limiting issues.
      const expertPrompt = userMessage + `\n\nBackground context for your consideration:\n${backgroundContext}\n\nPlease use the shared background research and citations provided in the context above. Base your analysis on this research and your expertise.`;

      const completion = await safeChatCompletion(this.openai, {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: expertPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const finalResponse = completion.choices[0]?.message;

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
        if (Array.isArray(parsedResponse.sources)) {
          parsedResponse.sources = sanitizeCitations(parsedResponse.sources);
        }
      } catch (error) {
        console.error('Failed to parse JSON response:', responseContent);
        throw new Error(`Failed to parse expert response as JSON: ${error}`);
      }

      parsedResponse.agent_id = this.agentId;
      parsedResponse.expertise_area = this.config.role;

      const validatedResponse = ExpertResponseSchema.parse(parsedResponse);
      console.log(`[${this.config.role}] Generated response with confidence ${validatedResponse.confidence}/10`);
      return validatedResponse;
    } catch (error) {
      console.error(`Expert agent error (${this.config.role}):`, error);
      throw new Error(`Expert agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Get agent ID
   */
  getId(): string {
    return this.agentId;
  }

  /**
   * Get agent role for identification
   */
  getRole(): string {
    return this.config.role;
  }
}
