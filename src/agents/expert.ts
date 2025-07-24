import OpenAI from 'openai';
import { PerplexityTool } from '../tools/perplexity.js';
import { ExpertResponse, ExpertResponseSchema, AgentConfig, DelphiPrompt } from '../types/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ExpertAgent {
  private openai: OpenAI;
  private perplexity: PerplexityTool;
  private config: AgentConfig;
  private agentId: string;
  private promptTemplate: string;

  constructor(
    openaiClient: OpenAI,
    perplexityTool: PerplexityTool,
    config: AgentConfig
  ) {
    this.openai = openaiClient;
    this.perplexity = perplexityTool;
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

      // Define the search function for the agent
      const searchFunction = {
        type: 'function' as const,
        function: {
          name: 'search_information',
          description: 'Search for current, authoritative information to support your analysis',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query to find relevant information'
              },
              searchType: {
                type: 'string',
                enum: ['web', 'academic', 'recent'],
                description: 'Type of search to perform'
              }
            },
            required: ['query']
          }
        }
      };

      // Use OpenAI's function calling to allow the agent to search for information
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        tools: [searchFunction],
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 2000
      });

      let searchResults: any[] = [];
      let finalResponse = completion.choices[0]?.message;

      // Handle tool calls (searches)
      if (finalResponse?.tool_calls) {
        const toolCallResults = [];
        
        for (const toolCall of finalResponse.tool_calls) {
          if (toolCall.function?.name === 'search_information') {
            const args = JSON.parse(toolCall.function.arguments);
            console.log(`[${this.config.role}] Searching: ${args.query}`);
            
            try {
              let searchResult;
              switch (args.searchType) {
                case 'academic':
                  searchResult = await this.perplexity.searchAcademic(args.query);
                  break;
                case 'recent':
                  searchResult = await this.perplexity.searchRecent(args.query);
                  break;
                default:
                  searchResult = await this.perplexity.search({
                    query: args.query,
                    searchContextSize: 'medium'
                  });
              }
              
              searchResults.push(...searchResult.searchResults);
              
              toolCallResults.push({
                tool_call_id: toolCall.id,
                role: 'tool' as const,
                content: JSON.stringify({
                  content: searchResult.content,
                  citations: searchResult.citations,
                  searchResults: searchResult.searchResults
                })
              });
            } catch (error) {
              console.error(`Search failed for ${args.query}:`, error);
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

        // Get the final response after tool calls
        const followUpCompletion = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
            finalResponse,
            ...toolCallResults
          ],
          temperature: 0.7,
          max_tokens: 2000
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
        // Extract JSON from the response (handle cases where there might be extra text)
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : responseContent;
        parsedResponse = JSON.parse(jsonString);
      } catch (error) {
        console.error('Failed to parse JSON response:', responseContent);
        throw new Error(`Failed to parse expert response as JSON: ${error}`);
      }

      // Ensure agent_id is set
      parsedResponse.agent_id = this.agentId;
      parsedResponse.expertise_area = this.config.role;

      // Validate the response using Zod
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