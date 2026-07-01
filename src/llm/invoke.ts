import { AsyncLocalStorage } from 'async_hooks';
import Anthropic from '@anthropic-ai/sdk';
import type {
  Message,
  MessageParam,
  TextBlock,
  ToolUseBlock
} from '@anthropic-ai/sdk/resources/messages';
import { CostTracker } from '../utils/cost-tracker.js';
import { costUsd, usdToPence } from './pricing.js';

const apiKeyStorage = new AsyncLocalStorage<string>();

/**
 * Runs `fn` inside an async context where `getAnthropic()` will use `apiKey`
 * instead of the environment variable. Used by the engine to support BYOK.
 */
export function runWithApiKey<T>(apiKey: string, fn: () => Promise<T>): Promise<T> {
  return apiKeyStorage.run(apiKey, fn);
}

export type Tier = 'light' | 'default' | 'heavy';

export type AgentLabel =
  | 'refiner'
  | 'decomposer'
  | 'persona'
  | 'expert'
  | 'contrarian'
  | 'orchestrator'
  | 'canvas'
  | 'cross_exam'
  | 'uncertainty'
  | 'counterfactual'
  | 'oppositional'
  | 'assumption'
  | 'regime_split'
  | 'regime_signals'
  | 'consensus_summary'
  | 'health'
  | 'web_search';

const DEFAULT_MODELS: Record<Tier, string> = {
  light: 'claude-haiku-4-5-20251001',
  default: 'claude-sonnet-4-6',
  heavy: 'claude-opus-4-7'
};

function resolveModel(tier: Tier): string {
  const env =
    tier === 'light'
      ? process.env.DELPHI_MODEL_LIGHT
      : tier === 'heavy'
        ? process.env.DELPHI_MODEL_HEAVY
        : process.env.DELPHI_MODEL_DEFAULT;
  return env || DEFAULT_MODELS[tier];
}

const CACHING_ENABLED = process.env.DELPHI_PROMPT_CACHING !== 'off';

let sharedClient: Anthropic | null = null;
export function getAnthropic(): Anthropic {
  const contextKey = apiKeyStorage.getStore();
  if (contextKey) {
    return new Anthropic({ apiKey: contextKey });
  }
  if (!sharedClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is required. Copy .env.example → .env and fill it in.'
      );
    }
    sharedClient = new Anthropic({ apiKey });
  }
  return sharedClient;
}

export function resetAnthropicClient(): void {
  sharedClient = null;
}

export interface InvokeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface InvokeOptions {
  tier: Tier;
  label: AgentLabel;
  system: string; // cacheable when long enough
  messages: InvokeMessage[];
  maxTokens?: number | undefined;
  temperature?: number | undefined;
  stopSequences?: string[] | undefined;
  tools?: any[] | undefined;
  toolChoice?: Anthropic.Messages.ToolChoice | undefined;
  costTracker?: CostTracker | undefined;
  round?: number | undefined;
  agentId?: string | undefined;
}

export interface InvokeResult {
  text: string;
  rawMessage: Message;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    webSearchQueries: number;
  };
  costUsd: number;
  costPence: number;
  stopReason: Message['stop_reason'];
}

const GBP_PER_USD = Number(process.env.GBP_PER_USD ?? 0.79);

export async function invokeModel(opts: InvokeOptions): Promise<InvokeResult> {
  const client = getAnthropic();
  const model = resolveModel(opts.tier);

  // System block — cache-marked when caching enabled. Anthropic silently
  // skips caching when the block is below the minimum token threshold.
  const systemBlocks: Anthropic.Messages.TextBlockParam[] = CACHING_ENABLED
    ? [
        {
          type: 'text',
          text: opts.system,
          cache_control: { type: 'ephemeral' }
        }
      ]
    : [{ type: 'text', text: opts.system }];

  const messages: MessageParam[] = opts.messages.map((m) => ({
    role: m.role,
    content: m.content
  }));

  const initialMaxTokens = opts.maxTokens ?? 2000;
  const request: Anthropic.Messages.MessageCreateParamsNonStreaming = {
    model,
    max_tokens: initialMaxTokens,
    system: systemBlocks,
    messages
  };
  // Opus 4.7 and later deprecate `temperature`; drop it for those models.
  const supportsTemperature = !/^claude-opus-4-[7-9]/.test(model);
  if (opts.temperature !== undefined && supportsTemperature) request.temperature = opts.temperature;
  if (opts.stopSequences) request.stop_sequences = opts.stopSequences;
  if (opts.tools) request.tools = opts.tools;
  if (opts.toolChoice) request.tool_choice = opts.toolChoice;

  let response = await client.messages.create(request);

  // One-shot retry: if the model was cut off, double the cap and try again.
  // Caps out at 16k tokens to avoid runaway; good enough for any of our sites.
  if (response.stop_reason === 'max_tokens' && initialMaxTokens < 16000) {
    const retryTokens = Math.min(16000, initialMaxTokens * 2);
    console.warn(
      `[invoke:${opts.label}] hit max_tokens (${initialMaxTokens}); retrying with ${retryTokens}`
    );
    request.max_tokens = retryTokens;
    response = await client.messages.create(request);
  }

  const text = extractText(response);
  const webSearchQueries = countServerToolUses(response, 'web_search');
  const inputTokens = response.usage.input_tokens ?? 0;
  const outputTokens = response.usage.output_tokens ?? 0;
  const cacheReadTokens = (response.usage as any).cache_read_input_tokens ?? 0;
  const cacheWriteTokens = (response.usage as any).cache_creation_input_tokens ?? 0;

  const usd = costUsd(model, {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    webSearchQueries
  });
  const pence = usdToPence(usd, GBP_PER_USD);

  if (opts.costTracker) {
    const invocation: any = {
      label: opts.label,
      model,
      tier: opts.tier,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
      webSearchQueries,
      costUsd: usd,
      costPence: pence
    };
    if (opts.round !== undefined) invocation.round = opts.round;
    if (opts.agentId !== undefined) invocation.agentId = opts.agentId;
    opts.costTracker.recordInvocation(invocation);
  }

  return {
    text,
    rawMessage: response,
    model,
    usage: {
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
      webSearchQueries
    },
    costUsd: usd,
    costPence: pence,
    stopReason: response.stop_reason
  };
}

export function extractText(message: Message): string {
  return message.content
    .filter((block): block is TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

export function extractToolUses(message: Message): ToolUseBlock[] {
  return message.content.filter(
    (block): block is ToolUseBlock => block.type === 'tool_use'
  );
}

function countServerToolUses(message: Message, toolName: string): number {
  // Server tools appear as `server_tool_use` blocks in the response content.
  return message.content.filter(
    (block: any) =>
      block?.type === 'server_tool_use' && block?.name === toolName
  ).length;
}

/**
 * Parse a JSON object or array from model text. Tolerates code fences,
 * leading prose, and obvious trailing commas. Tries several candidates and
 * returns the first that parses cleanly. Returns null if nothing parses.
 */
export type JsonShape = 'object' | 'array' | 'either';

/**
 * Parse a JSON value from model text. Tolerates code fences, leading prose,
 * trailing commas, and — when `shape: 'object'` is passed — unwraps a
 * single-element array that the model occasionally wraps the object in.
 */
export function parseJsonFromText<T = unknown>(
  text: string,
  shape: JsonShape = 'either'
): T | null {
  if (!text) return null;

  const candidates: string[] = [];

  // 1. Fenced block (```json ... ```)
  const fencedMatches = text.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/g);
  for (const m of fencedMatches) candidates.push(m[1]);

  // 2. Balanced span starting at the first `{` or `[` in the text.
  const balanced = extractBalancedJson(text);
  if (balanced) candidates.push(balanced);

  // 3. Legacy greedy spans — fallback if the balanced extractor fails.
  const objMatch = text.match(/\{[\s\S]*\}/);
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (objMatch) candidates.push(objMatch[0]);
  if (arrMatch) candidates.push(arrMatch[0]);

  // 4. The raw text itself (model might have returned bare JSON).
  candidates.push(text);

  for (const raw of candidates) {
    const cleaned = raw.trim();
    if (!cleaned) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const relaxed = cleaned
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/\/\/[^\n]*/g, '');
      try {
        parsed = JSON.parse(relaxed);
      } catch {
        continue;
      }
    }

    // Shape reconciliation:
    if (shape === 'object') {
      if (
        Array.isArray(parsed) &&
        parsed.length === 1 &&
        parsed[0] !== null &&
        typeof parsed[0] === 'object' &&
        !Array.isArray(parsed[0])
      ) {
        return parsed[0] as T;
      }
      if (Array.isArray(parsed)) continue; // keep trying other candidates
      return parsed as T;
    }
    if (shape === 'array') {
      if (Array.isArray(parsed)) return parsed as T;
      // If an object slipped through but has a single array property, unwrap it.
      if (parsed !== null && typeof parsed === 'object') {
        const arrays = Object.values(parsed as Record<string, unknown>).filter(Array.isArray);
        if (arrays.length === 1) return arrays[0] as T;
      }
      continue;
    }
    return parsed as T;
  }
  return null;
}

/**
 * Find the first `{` or `[` in the text and scan forward with a
 * bracket-depth counter (respecting string literals and escapes) to return
 * the balanced span. Returns null if no balanced JSON span is found.
 */
function extractBalancedJson(text: string): string | null {
  const start = text.search(/[\[{]/);
  if (start < 0) return null;

  const open = text[start];
  const close = open === '{' ? '}' : ']';

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}
