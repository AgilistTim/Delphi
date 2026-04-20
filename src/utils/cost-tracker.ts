import { TokenUsage, AgentUsage, CostSummary, AgentType } from '../types/index.js';

export interface InvocationRecord {
  label: AgentType | string;
  model: string;
  tier?: 'light' | 'default' | 'heavy' | undefined;
  round?: number | undefined;
  agentId?: string | undefined;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  webSearchQueries: number;
  costUsd: number;
  costPence: number;
}

export interface CostCapOptions {
  perSessionPence?: number | undefined;
  onExceeded?: ((current: number, cap: number) => void) | undefined;
}

export class CostTracker {
  private usageRecords: AgentUsage[] = [];
  private totalCostPence: number = 0;
  private totalCostUsd: number = 0;
  private invocationCount: number = 0;
  private webSearchCount: number = 0;
  private cap: CostCapOptions | undefined;

  constructor(cap?: CostCapOptions) {
    this.cap = cap;
  }

  /**
   * Primary recorder used by the LLM adapter. The existing `addUsage` method is
   * preserved for call sites that haven't migrated, but it converts to the same
   * underlying record shape.
   */
  recordInvocation(rec: InvocationRecord): void {
    const usage: TokenUsage = {
      prompt_tokens: rec.inputTokens,
      completion_tokens: rec.outputTokens,
      total_tokens: rec.inputTokens + rec.outputTokens,
      cache_read_tokens: rec.cacheReadTokens,
      cache_write_tokens: rec.cacheWriteTokens,
      web_search_queries: rec.webSearchQueries,
      estimated_cost_usd: rec.costUsd,
      estimated_cost_pence: rec.costPence
    };

    const record: AgentUsage = {
      agent_type: rec.label as AgentType,
      usage,
      model: rec.model
    };
    if (rec.tier) record.tier = rec.tier;
    if (rec.round !== undefined) record.round = rec.round;
    if (rec.agentId !== undefined) record.agent_id = rec.agentId;

    this.usageRecords.push(record);
    this.totalCostPence += rec.costPence;
    this.totalCostUsd += rec.costUsd;
    this.invocationCount += 1;
    this.webSearchCount += rec.webSearchQueries;

    if (this.cap?.perSessionPence !== undefined && this.totalCostPence > this.cap.perSessionPence) {
      this.cap.onExceeded?.(this.totalCostPence, this.cap.perSessionPence);
    }
  }

  // Back-compat shim for older call sites (refiner used to call addUsage
  // directly with an OpenAI-shaped usage object). New code should use
  // recordInvocation via invokeModel's costTracker option.
  addUsage(
    agentType: AgentType,
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number },
    model?: string,
    agentId?: string,
    round?: number
  ): void {
    this.recordInvocation({
      label: agentType,
      model: model ?? 'claude-sonnet-4-6',
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      webSearchQueries: 0,
      costUsd: 0,
      costPence: 0,
      ...(agentId !== undefined ? { agentId } : {}),
      ...(round !== undefined ? { round } : {})
    });
  }

  /** Current cumulative cost in pence (for cap checks). */
  getCostPence(): number {
    return this.totalCostPence;
  }

  getCostUsd(): number {
    return this.totalCostUsd;
  }

  getSummary(): CostSummary {
    const breakdownByAgentType: Record<string, TokenUsage> = {};
    const breakdownByRound: Record<number, TokenUsage> = {};

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalCacheReadTokens = 0;
    let totalCacheWriteTokens = 0;
    let totalWebSearchQueries = 0;
    let totalTokens = 0;
    let totalCostUsd = 0;
    let totalCostPence = 0;

    const ensureBucket = (map: Record<string | number, TokenUsage>, key: string | number): TokenUsage => {
      if (!map[key]) {
        map[key] = {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          web_search_queries: 0,
          estimated_cost_usd: 0,
          estimated_cost_pence: 0
        };
      }
      return map[key];
    };

    for (const record of this.usageRecords) {
      const u = record.usage;
      totalPromptTokens += u.prompt_tokens;
      totalCompletionTokens += u.completion_tokens;
      totalCacheReadTokens += u.cache_read_tokens ?? 0;
      totalCacheWriteTokens += u.cache_write_tokens ?? 0;
      totalWebSearchQueries += u.web_search_queries ?? 0;
      totalTokens += u.total_tokens;
      totalCostUsd += u.estimated_cost_usd ?? 0;
      totalCostPence += u.estimated_cost_pence ?? 0;

      const typeBucket = ensureBucket(breakdownByAgentType, record.agent_type);
      typeBucket.prompt_tokens += u.prompt_tokens;
      typeBucket.completion_tokens += u.completion_tokens;
      typeBucket.total_tokens += u.total_tokens;
      typeBucket.cache_read_tokens! += u.cache_read_tokens ?? 0;
      typeBucket.cache_write_tokens! += u.cache_write_tokens ?? 0;
      typeBucket.web_search_queries! += u.web_search_queries ?? 0;
      typeBucket.estimated_cost_usd! += u.estimated_cost_usd ?? 0;
      typeBucket.estimated_cost_pence! += u.estimated_cost_pence ?? 0;

      if (record.round !== undefined) {
        const roundBucket = ensureBucket(breakdownByRound, record.round);
        roundBucket.prompt_tokens += u.prompt_tokens;
        roundBucket.completion_tokens += u.completion_tokens;
        roundBucket.total_tokens += u.total_tokens;
        roundBucket.cache_read_tokens! += u.cache_read_tokens ?? 0;
        roundBucket.cache_write_tokens! += u.cache_write_tokens ?? 0;
        roundBucket.web_search_queries! += u.web_search_queries ?? 0;
        roundBucket.estimated_cost_usd! += u.estimated_cost_usd ?? 0;
        roundBucket.estimated_cost_pence! += u.estimated_cost_pence ?? 0;
      }
    }

    return {
      total_tokens: totalTokens,
      total_prompt_tokens: totalPromptTokens,
      total_completion_tokens: totalCompletionTokens,
      total_cache_read_tokens: totalCacheReadTokens,
      total_cache_write_tokens: totalCacheWriteTokens,
      total_web_search_queries: totalWebSearchQueries,
      estimated_total_cost_usd: round4(totalCostUsd),
      estimated_total_cost_pence: round2(totalCostPence),
      breakdown_by_agent_type: breakdownByAgentType,
      breakdown_by_round: breakdownByRound as Record<number, TokenUsage>,
      invocation_count: this.invocationCount,
      web_search_count: this.webSearchCount
    };
  }

  getRecords(): AgentUsage[] {
    return [...this.usageRecords];
  }

  reset(): void {
    this.usageRecords = [];
    this.totalCostPence = 0;
    this.totalCostUsd = 0;
    this.invocationCount = 0;
    this.webSearchCount = 0;
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
