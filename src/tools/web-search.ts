import type { Message } from '@anthropic-ai/sdk/resources/messages';
import { Citation, SearchParams, SearchResult } from '../types/index.js';
import { invokeModel, extractText } from '../llm/invoke.js';
import type { CostTracker } from '../utils/cost-tracker.js';
import { sanitizeCitations } from '../utils/citation-sanitize.js';

/**
 * Drop-in replacement for the old Perplexity tool. Uses Anthropic's
 * server-side `web_search_20250305` tool to run research turns and returns
 * the same `{ content, citations, searchResults }` shape that the rest of
 * the engine expects.
 */
export interface WebSearchResponse {
  content: string;
  citations: Citation[];
  searchResults: SearchResult[];
}

export interface WebSearchOptions {
  costTracker?: CostTracker;
  round?: number;
}

const RESEARCH_SYSTEM = `You are a research analyst for a Delphi expert panel. Given a query, use the web_search tool to gather up-to-date, primary sources. Produce a concise, factual summary that helps experts reason about the question. Prefer recent and authoritative sources. After the summary, append a fenced JSON block listing the sources you actually used:

\`\`\`json
{
  "sources": [
    {"title": "...", "url": "https://...", "date": "YYYY-MM-DD", "relevance": "one sentence on why this source matters"}
  ]
}
\`\`\`

Do not speculate. Do not fabricate URLs.`;

export class WebSearchTool {
  private defaultOptions: WebSearchOptions;

  constructor(opts: WebSearchOptions = {}) {
    this.defaultOptions = opts;
  }

  /** Main search — equivalent to the old PerplexityTool.search(). */
  async search(params: SearchParams, opts?: WebSearchOptions): Promise<WebSearchResponse> {
    const merged = { ...this.defaultOptions, ...opts };
    const maxUses = contextSizeToMaxUses(params.searchContextSize ?? 'medium');
    const userMessage = buildResearchQuery(params);

    const result = await invokeModel({
      tier: 'default',
      label: 'web_search',
      system: RESEARCH_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 8000,
      temperature: 0.2,
      tools: [webSearchToolSpec({ maxUses })],
      round: merged.round,
      costTracker: merged.costTracker
    });

    const { summary, citations, searchResults } = parseResearchOutput(result.rawMessage);

    return {
      content: summary,
      citations: sanitizeCitations(citations),
      searchResults
    };
  }

  async searchAcademic(query: string, opts?: WebSearchOptions): Promise<WebSearchResponse> {
    return this.search(
      {
        query: `${query}\n\n(Prefer peer-reviewed journals, academic publishers, and .edu / .gov sources.)`,
        searchContextSize: 'high'
      },
      opts
    );
  }

  async searchRecent(
    query: string,
    daysBack: number = 30,
    opts?: WebSearchOptions
  ): Promise<WebSearchResponse> {
    return this.search(
      {
        query: `${query}\n\n(Only sources published in the last ${daysBack} days.)`,
        searchContextSize: 'medium'
      },
      opts
    );
  }

  async searchDomains(
    query: string,
    domains: string[],
    opts?: WebSearchOptions
  ): Promise<WebSearchResponse> {
    return this.search(
      {
        query,
        domainFilter: domains,
        searchContextSize: 'medium'
      },
      opts
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.search({
        query: 'test query for API health check',
        searchContextSize: 'low'
      });
      return response.content.length > 0;
    } catch (error) {
      console.error('Web search health check failed:', error);
      return false;
    }
  }
}

function buildResearchQuery(params: SearchParams): string {
  const parts: string[] = [];
  parts.push(`Research query: ${params.query}`);
  if (params.domainFilter && params.domainFilter.length > 0) {
    parts.push(`Prefer these domains if relevant: ${params.domainFilter.join(', ')}.`);
  }
  if (params.dateFilter?.after) {
    parts.push(`Prefer sources published after ${params.dateFilter.after}.`);
  }
  if (params.dateFilter?.before) {
    parts.push(`Prefer sources published before ${params.dateFilter.before}.`);
  }
  if (params.searchMode === 'academic') {
    parts.push('Prefer academic and peer-reviewed sources.');
  }
  return parts.join('\n');
}

export function webSearchToolSpec(opts: { maxUses?: number } = {}): any {
  return {
    type: 'web_search_20250305',
    name: 'web_search',
    max_uses: opts.maxUses ?? 3
  };
}

function contextSizeToMaxUses(size: 'low' | 'medium' | 'high'): number {
  switch (size) {
    case 'low':
      return 2;
    case 'high':
      return 6;
    case 'medium':
    default:
      return 4;
  }
}

interface ParsedResearch {
  summary: string;
  citations: Citation[];
  searchResults: SearchResult[];
}

function parseResearchOutput(message: Message): ParsedResearch {
  const text = extractText(message);
  const citations: Citation[] = [];

  // 1. JSON-fenced citations (model-authored).
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (Array.isArray(parsed.sources)) {
        for (const s of parsed.sources) {
          if (s?.url && s?.title) {
            citations.push({
              title: String(s.title),
              url: String(s.url),
              date: s.date ? String(s.date) : undefined,
              relevance: s.relevance ? String(s.relevance) : undefined
            });
          }
        }
      }
    } catch {
      // ignore — fall through to raw tool results
    }
  }

  // 2. Native web_search_tool_result blocks (authoritative — actual API-returned hits).
  const searchResults: SearchResult[] = [];
  for (const block of message.content as any[]) {
    if (block?.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const entry of block.content) {
        if (!entry?.url) continue;
        const title = entry.title ? String(entry.title) : 'Untitled';
        const url = String(entry.url);
        if (!citations.some((c) => c.url === url)) {
          citations.push({
            title,
            url,
            date: entry.page_age ? String(entry.page_age) : undefined
          });
        }
        const sr: SearchResult = {
          title,
          url,
          summary: entry.encrypted_content ? '' : (entry.snippet ?? ''),
          relevance_score: 0.8
        };
        if (entry.page_age) sr.date = String(entry.page_age);
        searchResults.push(sr);
      }
    }
  }

  // If no tool-result blocks but we have model-authored citations, synthesise search results.
  if (searchResults.length === 0 && citations.length > 0) {
    for (const c of citations) {
      const result: SearchResult = {
        title: c.title,
        url: c.url,
        summary: c.relevance ?? 'Reference material'
      };
      if (c.date !== undefined) result.date = c.date;
      searchResults.push(result);
    }
  }

  const summary = text.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
  return { summary, citations, searchResults };
}
