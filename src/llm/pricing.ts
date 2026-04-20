// Anthropic Claude 4.x pricing (USD per 1M tokens).
// Keep in sync with https://www.anthropic.com/pricing.
//
// Cache writes: input × 1.25 (ephemeral 5-min)
// Cache reads:  input × 0.10

export interface ModelPricing {
  input: number;  // USD per 1M input tokens (uncached)
  output: number; // USD per 1M output tokens
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-opus-4-7': { input: 15.0, output: 75.0 },

  // Legacy identifiers kept so old cost records deserialise.
  'gpt-4o': { input: 2.5, output: 10.0 }
};

export const CACHE_WRITE_MULTIPLIER = 1.25;
export const CACHE_READ_MULTIPLIER = 0.1;

// Anthropic web_search tool: billed per query, ~$10 per 1000 queries.
export const WEB_SEARCH_COST_USD_PER_QUERY = 0.01;

export interface UsageBreakdown {
  inputTokens: number;        // uncached new input
  outputTokens: number;
  cacheReadTokens?: number;   // charged at 10%
  cacheWriteTokens?: number;  // charged at 125%
  webSearchQueries?: number;
}

export function costUsd(model: string, usage: UsageBreakdown): number {
  const price = MODEL_PRICING[model] ?? MODEL_PRICING['claude-sonnet-4-6'];
  const inCost = (usage.inputTokens / 1e6) * price.input;
  const outCost = (usage.outputTokens / 1e6) * price.output;
  const cacheRead =
    ((usage.cacheReadTokens ?? 0) / 1e6) * price.input * CACHE_READ_MULTIPLIER;
  const cacheWrite =
    ((usage.cacheWriteTokens ?? 0) / 1e6) * price.input * CACHE_WRITE_MULTIPLIER;
  const search = (usage.webSearchQueries ?? 0) * WEB_SEARCH_COST_USD_PER_QUERY;
  return inCost + outCost + cacheRead + cacheWrite + search;
}

export function usdToPence(usd: number, gbpPerUsd: number = 0.79): number {
  return usd * gbpPerUsd * 100;
}
