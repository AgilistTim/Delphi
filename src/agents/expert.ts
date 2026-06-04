import { ExpertResponse, ExpertResponseSchema, AgentConfig, DelphiPrompt } from '../types/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeCitations } from '../utils/citation-sanitize.js';
import { invokeModel, parseJsonFromText } from '../llm/invoke.js';
import type { CostTracker } from '../utils/cost-tracker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ExpertAgent {
  private config: AgentConfig;
  private agentId: string;
  private promptTemplate: string;
  private costTracker: CostTracker | undefined;

  constructor(config: AgentConfig, costTracker?: CostTracker) {
    this.config = config;
    this.agentId = uuidv4();
    this.costTracker = costTracker;

    this.promptTemplate = readFileSync(
      join(__dirname, '../prompts/expert_prompt.md'),
      'utf-8'
    );
  }

  async generateResponse(
    prompt: DelphiPrompt,
    synthesisContext?: string,
    roundNumber: number = 1
  ): Promise<ExpertResponse> {
    try {
      const systemPrompt = this.promptTemplate
        .replace('{{ROLE}}', this.config.role)
        .replace('{{EXPERTISE_AREAS}}', this.config.expertise_areas.join(', '))
        .replace('{{PERSPECTIVE}}', this.config.perspective)
        .replace('{{AGENT_ID}}', this.agentId);

      let userMessage = `Question: ${prompt.question}\n\n`;
      if (prompt.context) userMessage += `Context: ${prompt.context}\n\n`;
      if (prompt.constraints && prompt.constraints.length > 0) {
        userMessage += `Constraints: ${prompt.constraints.join(', ')}\n\n`;
      }
      if (synthesisContext) {
        userMessage += `Previous Round Synthesis:\n${synthesisContext}\n\n`;
        userMessage += `Please refine or update your position based on this synthesis. `;
      }
      userMessage += `Please provide your expert analysis as a ${this.config.role} with expertise in ${this.config.expertise_areas.join(', ')}.`;

      // 1. Background/context (no tools) — keeps expert grounded before it commits to a position.
      const background = await invokeModel({
        tier: 'default',
        label: 'expert',
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content:
              userMessage +
              '\n\nSummarise the background and key considerations for this question. Do not cite sources.'
          }
        ],
        maxTokens: 1500,
        temperature: 0.5,
        round: roundNumber,
        agentId: this.agentId,
        costTracker: this.costTracker
      });

      // 2. Structured expert response. Per-expert web_search is disabled by default —
      // experts use the shared research provided in context.
      const expertPrompt =
        userMessage +
        `\n\nBackground context for your consideration:\n${background.text}\n\nPlease use the shared background research and citations provided in the context above. Base your analysis on this research and your expertise.`;

      const main = await invokeModel({
        tier: 'default',
        label: 'expert',
        system: systemPrompt,
        messages: [{ role: 'user', content: expertPrompt }],
        maxTokens: 12000,
        temperature: 0.7,
        round: roundNumber,
        agentId: this.agentId,
        costTracker: this.costTracker
      });

      if (!main.text) {
        throw new Error('No response content received from Anthropic');
      }

      const parsedResponse = parseJsonFromText<any>(main.text, 'object');
      if (!parsedResponse || Array.isArray(parsedResponse)) {
        console.error(`[expert:${this.config.role}] stop_reason: ${main.stopReason}`);
        console.error(`[expert:${this.config.role}] raw (first 1000):\n${main.text.slice(0, 1000)}`);
        console.error(`[expert:${this.config.role}] raw (last 500):\n${main.text.slice(-500)}`);
        throw new Error('Failed to parse expert response as JSON');
      }

      if (Array.isArray(parsedResponse.sources)) {
        parsedResponse.sources = sanitizeCitations(parsedResponse.sources);
      }
      parsedResponse.agent_id = this.agentId;
      parsedResponse.expertise_area = this.config.role;

      const validatedResponse = ExpertResponseSchema.parse(parsedResponse);
      console.log(
        `[${this.config.role}] Generated response with confidence ${validatedResponse.confidence}/10`
      );
      return validatedResponse;
    } catch (error) {
      console.error(`Expert agent error (${this.config.role}):`, error);
      throw new Error(
        `Expert agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  getId(): string {
    return this.agentId;
  }

  getRole(): string {
    return this.config.role;
  }
}
