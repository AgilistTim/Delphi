import { TokenUsage, AgentUsage, CostSummary } from '../types/index.js';

const PRICING = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'sonar-reasoning-pro': { input: 2.00, output: 8.00 },
  'sonar-reasoning': { input: 1.00, output: 5.00 },
  'sonar-pro': { input: 3.00, output: 15.00 },
  'sonar': { input: 1.00, output: 5.00 },
};

export class CostTracker {
  private usageRecords: AgentUsage[] = [];
  private perplexityCalls: number = 0;
  private openaiCalls: number = 0;

  addUsage(
    agentType: AgentUsage['agent_type'],
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number },
    model?: string,
    agentId?: string,
    round?: number
  ): void {
    const estimatedCost = this.estimateCost(usage.prompt_tokens, usage.completion_tokens, model);
    
    const record: AgentUsage = {
      agent_type: agentType,
      usage: {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        estimated_cost_usd: estimatedCost
      }
    };
    
    if (agentId !== undefined) {
      record.agent_id = agentId;
    }
    if (round !== undefined) {
      record.round = round;
    }
    if (model !== undefined) {
      record.model = model;
    }
    
    this.usageRecords.push(record);

    if (agentType === 'perplexity') {
      this.perplexityCalls++;
    } else {
      this.openaiCalls++;
    }
  }

  addPerplexityCall(estimatedTokens?: number, model?: string): void {
    const tokens = estimatedTokens || 1000;
    this.addUsage('perplexity', {
      prompt_tokens: Math.floor(tokens * 0.3),
      completion_tokens: Math.floor(tokens * 0.7),
      total_tokens: tokens
    }, model || 'sonar-reasoning-pro');
  }

  private estimateCost(promptTokens: number, completionTokens: number, model?: string): number {
    const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-4o'];
    const inputCost = (promptTokens / 1_000_000) * pricing.input;
    const outputCost = (completionTokens / 1_000_000) * pricing.output;
    return Math.round((inputCost + outputCost) * 10000) / 10000;
  }

  getSummary(): CostSummary {
    const breakdownByAgentType: Record<string, TokenUsage> = {};
    const breakdownByRound: Record<number, TokenUsage> = {};

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;
    let totalCost = 0;

    for (const record of this.usageRecords) {
      totalPromptTokens += record.usage.prompt_tokens;
      totalCompletionTokens += record.usage.completion_tokens;
      totalTokens += record.usage.total_tokens;
      totalCost += record.usage.estimated_cost_usd || 0;

      if (!breakdownByAgentType[record.agent_type]) {
        breakdownByAgentType[record.agent_type] = {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          estimated_cost_usd: 0
        };
      }
      breakdownByAgentType[record.agent_type].prompt_tokens += record.usage.prompt_tokens;
      breakdownByAgentType[record.agent_type].completion_tokens += record.usage.completion_tokens;
      breakdownByAgentType[record.agent_type].total_tokens += record.usage.total_tokens;
      breakdownByAgentType[record.agent_type].estimated_cost_usd! += record.usage.estimated_cost_usd || 0;

      if (record.round !== undefined) {
        if (!breakdownByRound[record.round]) {
          breakdownByRound[record.round] = {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
            estimated_cost_usd: 0
          };
        }
        breakdownByRound[record.round].prompt_tokens += record.usage.prompt_tokens;
        breakdownByRound[record.round].completion_tokens += record.usage.completion_tokens;
        breakdownByRound[record.round].total_tokens += record.usage.total_tokens;
        breakdownByRound[record.round].estimated_cost_usd! += record.usage.estimated_cost_usd || 0;
      }
    }

    return {
      total_tokens: totalTokens,
      total_prompt_tokens: totalPromptTokens,
      total_completion_tokens: totalCompletionTokens,
      estimated_total_cost_usd: Math.round(totalCost * 10000) / 10000,
      breakdown_by_agent_type: breakdownByAgentType,
      breakdown_by_round: breakdownByRound,
      perplexity_calls: this.perplexityCalls,
      openai_calls: this.openaiCalls
    };
  }

  getRecords(): AgentUsage[] {
    return [...this.usageRecords];
  }

  reset(): void {
    this.usageRecords = [];
    this.perplexityCalls = 0;
    this.openaiCalls = 0;
  }
}
