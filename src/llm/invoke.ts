import Anthropic from '@anthropic-ai/sdk';
import type {
  Message,
  MessageParam,
  TextBlock,
  ToolUseBlock
} from '@anthropic-ai/sdk/resources/messages';
import { CostTracker } from '../utils/cost-tracker.js';
import { costUsd, usdToPence } from './pricing.js';

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

  const request: Anthropic.Messages.MessageCreateParamsNonStreaming = {
    model,
    max_tokens: opts.maxTokens ?? 2000,
    system: systemBlocks,
    messages
  };
  if (opts.temperature !== undefined) request.temperature = opts.temperature;
  if (opts.stopSequences) request.stop_sequences = opts.stopSequences;
  if (opts.tools) request.tools = opts.tools;
  if (opts.toolChoice) request.tool_choice = opts.toolChoice;

  const response = await client.messages.create(request);

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
 * Parse a JSON object or array from model text. Tolerates code fences and
 * leading prose. Returns null if no parseable JSON is found.
 */
export function parseJsonFromText<T = unknown>(text: string): T | null {
  if (!text) return null;
  // Try fenced first
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : text;
  // Prefer the widest { .. } or [ .. ] span
  const objMatch = candidate.match(/\{[\s\S]*\}/);
  const arrMatch = candidate.match(/\[[\s\S]*\]/);
  let span: string | null = null;
  if (objMatch && arrMatch) {
    span = objMatch[0].length >= arrMatch[0].length ? objMatch[0] : arrMatch[0];
  } else {
    span = objMatch?.[0] ?? arrMatch?.[0] ?? candidate;
  }
  try {
    return JSON.parse(span) as T;
  } catch {
    return null;
  }
}
