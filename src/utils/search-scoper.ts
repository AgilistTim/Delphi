import { QuestionAnalysis, Citation } from '../types/index.js';
import { WebSearchTool, WebSearchOptions } from '../tools/web-search.js';

const POLICY_DOMAINS = [
  'gov.uk', 'europa.eu', 'who.int', 'un.org', 'oecd.org',
  'imf.org', 'worldbank.org', 'state.gov', 'congress.gov',
  'parliament.uk', 'ec.europa.eu', 'legislation.gov.uk'
];

const ACADEMIC_DOMAINS = [
  'arxiv.org', 'pubmed.ncbi.nlm.nih.gov', 'scholar.google.com',
  'nature.com', 'science.org', 'jstor.org', 'ssrn.com'
];

const INDUSTRY_DOMAINS = [
  'mckinsey.com', 'bcg.com', 'hbr.org', 'gartner.com',
  'forrester.com', 'techcrunch.com', 'wired.com'
];

function getRecencyDays(timeHorizon: string): number {
  switch (timeHorizon) {
    case 'immediate': return 90;
    case 'short_term': return 180;
    case 'medium_term': return 365;
    case 'long_term': return 730;
    default: return 365;
  }
}

function getDomains(decisionType: string): string[] | undefined {
  switch (decisionType) {
    case 'policy': return POLICY_DOMAINS;
    case 'research': return ACADEMIC_DOMAINS;
    case 'product':
    case 'strategy': return INDUSTRY_DOMAINS;
    default: return undefined;
  }
}

export async function scopedSearch(
  search: WebSearchTool,
  query: string,
  questionAnalysis?: QuestionAnalysis,
  opts: WebSearchOptions = {}
): Promise<{ content: string; citations: Citation[]; searchResults: any[] }> {
  if (!questionAnalysis) {
    return search.search({ query, searchContextSize: 'medium' }, opts);
  }

  const domains = getDomains(questionAnalysis.decision_type);
  const recencyDays = getRecencyDays(questionAnalysis.time_horizon);

  if (questionAnalysis.time_horizon === 'immediate' || questionAnalysis.time_horizon === 'short_term') {
    console.log(`   📅 Scoping search to last ${recencyDays} days (time_horizon: ${questionAnalysis.time_horizon})`);
    return search.searchRecent(query, recencyDays, opts);
  }

  if (domains) {
    console.log(`   🌐 Scoping search to ${questionAnalysis.decision_type} domains`);
    return search.searchDomains(query, domains, opts);
  }

  if (questionAnalysis.decision_type === 'research') {
    console.log(`   🎓 Using academic search mode`);
    return search.searchAcademic(query, opts);
  }

  return search.search({ query, searchContextSize: 'medium' }, opts);
}
