import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { SearchParams, SearchResult, Citation } from '../types/index.js';
import { sanitizeCitations } from '../utils/citation-sanitize.js';

export class PerplexityTool {
  private client: AxiosInstance;
  private model: string;

  constructor(apiKey: string, model: string = 'sonar-reasoning-pro') {
    this.model = model;
    this.client = axios.create({
      baseURL: 'https://api.perplexity.ai',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Perplexity API Error:', error.response?.data || error.message);
        throw new Error(`Perplexity API failed: ${error.response?.data?.error || error.message}`);
      }
    );
  }

  /**
   * Format date as MM/DD/YYYY for Perplexity API
   */
  private static formatDateMMDDYYYY(date: Date): string {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

  /**
   * Search for information using Perplexity API, with retry logic
   */
  async search(params: SearchParams): Promise<{
    content: string;
    citations: Citation[];
    searchResults: SearchResult[];
  }> {
    const maxRetries = 3;
    let attempt = 0;
    let lastError: any = null;
    while (attempt < maxRetries) {
      try {
        // Format date filters if present
        let search_after_date_filter: string | undefined = undefined;
        let search_before_date_filter: string | undefined = undefined;
        if (params.dateFilter?.after) {
          const afterDate = new Date(params.dateFilter.after);
          search_after_date_filter = PerplexityTool.formatDateMMDDYYYY(afterDate);
        }
        if (params.dateFilter?.before) {
          const beforeDate = new Date(params.dateFilter.before);
          search_before_date_filter = PerplexityTool.formatDateMMDDYYYY(beforeDate);
        }

        const payload = {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a research assistant. Provide detailed, well-sourced information with proper citations. Be objective and comprehensive in your analysis.'
            },
            {
              role: 'user', 
              content: params.query
            }
          ],
          search_mode: params.searchMode || 'web',
          web_search_options: {
            search_context_size: params.searchContextSize || 'medium'
          },
          return_citations: true,
          ...(params.domainFilter && { search_domain_filter: params.domainFilter }),
          ...(search_after_date_filter && { search_after_date_filter }),
          ...(search_before_date_filter && { search_before_date_filter })
        };

        const response: AxiosResponse = await this.client.post('/chat/completions', payload);
        
        const data = response.data;
        
        // Extract content
        const content = data.choices?.[0]?.message?.content || '';
        
        // Extract citations from response
        const citations: Citation[] = sanitizeCitations(data.citations);

        // Extract search results if available
        const searchResults: SearchResult[] = (data.search_results || []).map((result: any) => ({
          title: result.title || 'Untitled',
          url: result.url || '',
          date: result.date,
          summary: result.summary || content.substring(0, 200) + '...',
          relevance_score: 0.8 // Default relevance
        }));

        // If no search results but we have citations, create search results from citations
        if (searchResults.length === 0 && citations.length > 0) {
          citations.forEach((citation, index) => {
            searchResults.push({
              title: citation.title,
              url: citation.url,
              summary: `Reference material ${index + 1}`,
              relevance_score: 0.7
            });
          });
        }

        return {
          content,
          citations,
          searchResults
        };
      } catch (error: any) {
        lastError = error;
        // Retry on timeout or 5xx errors
        const isTimeout = error.message && error.message.includes('timeout');
        const is5xx = error.response && error.response.status >= 500 && error.response.status < 600;
        if ((isTimeout || is5xx) && attempt < maxRetries - 1) {
          const backoff = 1000 * Math.pow(2, attempt); // Exponential backoff: 1s, 2s, 4s
          console.warn(`Perplexity API error (attempt ${attempt + 1}): ${error.message || error}. Retrying in ${backoff / 1000}s...`);
          await new Promise(res => setTimeout(res, backoff));
          attempt++;
          continue;
        }
        // Otherwise, throw
        console.error('Perplexity API Error:', error.response?.data || error.message);
        throw new Error(`Perplexity API failed: ${error.response?.data?.error || error.message}`);
      }
    }
    throw new Error(`Perplexity API failed after ${maxRetries} attempts: ${lastError?.message || lastError}`);
  }

  /**
   * Search specifically for academic sources
   */
  async searchAcademic(query: string): Promise<{
    content: string;
    citations: Citation[];
    searchResults: SearchResult[];
  }> {
    return this.search({
      query,
      searchMode: 'academic',
      searchContextSize: 'high'
    });
  }

  /**
   * Search with date constraints
   */
  async searchRecent(query: string, daysBack: number = 30): Promise<{
    content: string;
    citations: Citation[];
    searchResults: SearchResult[];
  }> {
    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - daysBack);
    // Format as MM/DD/YYYY
    const afterDateStr = PerplexityTool.formatDateMMDDYYYY(afterDate);
    return this.search({
      query,
      searchContextSize: 'medium',
      dateFilter: {
        after: afterDateStr
      }
    });
  }

  /**
   * Search specific domains only
   */
  async searchDomains(query: string, domains: string[]): Promise<{
    content: string;
    citations: Citation[];
    searchResults: SearchResult[];
  }> {
    return this.search({
      query,
      domainFilter: domains,
      searchContextSize: 'medium'
    });
  }

  /**
   * Validate search results quality
   */
  // private validateSearchResults(results: SearchResult[]): boolean {
  //   return results.length > 0 && results.some(result => 
  //     result.url && result.title && result.title !== 'Untitled'
  //   );
  // }

  /**
   * Health check for the API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.search({
        query: 'test query for API health check',
        searchContextSize: 'low'
      });
      return response.content.length > 0;
    } catch (error) {
      console.error('Perplexity health check failed:', error);
      return false;
    }
  }
} 