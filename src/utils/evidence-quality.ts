import { Citation, EvidenceQuality, ScoredCitation, SourceType } from '../types/index.js';

const ACADEMIC_DOMAINS = [
  'arxiv.org', 'pubmed.ncbi.nlm.nih.gov', 'scholar.google.com', 'jstor.org',
  'sciencedirect.com', 'springer.com', 'nature.com', 'science.org', 'wiley.com',
  'tandfonline.com', 'researchgate.net', 'ssrn.com', 'doi.org', 'ieee.org',
  'acm.org', 'ncbi.nlm.nih.gov', 'plos.org', 'frontiersin.org', 'mdpi.com',
  'biorxiv.org', 'medrxiv.org', 'cambridge.org', 'oup.com'
];

const GOVERNMENT_DOMAINS = [
  'gov.uk', 'gov.us', 'europa.eu', 'who.int', 'un.org', 'oecd.org',
  'imf.org', 'worldbank.org', 'state.gov', 'congress.gov', 'parliament.uk',
  'ec.europa.eu', 'cdc.gov', 'fda.gov', 'epa.gov', 'nist.gov',
  'nih.gov', 'nsf.gov', 'gao.gov', 'bls.gov', 'census.gov'
];

const NEWS_DOMAINS = [
  'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'nytimes.com',
  'washingtonpost.com', 'economist.com', 'ft.com', 'bloomberg.com',
  'theguardian.com', 'wsj.com', 'npr.org', 'aljazeera.com'
];

const INDUSTRY_DOMAINS = [
  'mckinsey.com', 'bcg.com', 'bain.com', 'deloitte.com', 'pwc.com',
  'accenture.com', 'gartner.com', 'forrester.com', 'hbr.org',
  'techcrunch.com', 'wired.com', 'arstechnica.com', 'technologyreview.com'
];

function classifySourceType(url: string): SourceType {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (ACADEMIC_DOMAINS.some(d => hostname.includes(d))) return 'academic';
    if (GOVERNMENT_DOMAINS.some(d => hostname.includes(d))) return 'government';
    if (NEWS_DOMAINS.some(d => hostname.includes(d))) return 'news';
    if (INDUSTRY_DOMAINS.some(d => hostname.includes(d))) return 'industry';
    if (hostname.includes('blog') || hostname.includes('medium.com') || hostname.includes('substack.com')) return 'blog';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function calculateRecencyScore(dateStr?: string): number {
  if (!dateStr) return 0.5;
  try {
    const sourceDate = new Date(dateStr);
    const now = new Date();
    const daysDiff = (now.getTime() - sourceDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff < 90) return 1.0;
    if (daysDiff < 365) return 0.8;
    if (daysDiff < 730) return 0.6;
    if (daysDiff < 1825) return 0.4;
    return 0.2;
  } catch {
    return 0.5;
  }
}

function calculateDomainAuthority(sourceType: SourceType): number {
  const authorityMap: Record<SourceType, number> = {
    academic: 0.95,
    government: 0.9,
    news: 0.7,
    industry: 0.65,
    blog: 0.3,
    unknown: 0.4
  };
  return authorityMap[sourceType];
}

export function scoreEvidence(citation: Citation): EvidenceQuality {
  const source_type = classifySourceType(citation.url);
  const recency_score = calculateRecencyScore(citation.date);
  const domain_authority = calculateDomainAuthority(source_type);
  const overall_score = (domain_authority * 0.5) + (recency_score * 0.3) + (source_type === 'academic' ? 0.2 : source_type === 'government' ? 0.15 : 0.05);

  return {
    source_type,
    recency_score,
    domain_authority,
    overall_score: Math.min(1, overall_score)
  };
}

export function scoreCitations(citations: Citation[]): ScoredCitation[] {
  return citations.map(citation => ({
    ...citation,
    evidence_quality: scoreEvidence(citation)
  }));
}

export function getEvidenceQualitySummary(citations: ScoredCitation[]): {
  average_quality: number;
  source_breakdown: Record<SourceType, number>;
  strongest_source_type: SourceType;
} {
  if (citations.length === 0) {
    return { average_quality: 0, source_breakdown: { academic: 0, government: 0, news: 0, industry: 0, blog: 0, unknown: 0 }, strongest_source_type: 'unknown' };
  }

  const scores = citations.map(c => c.evidence_quality?.overall_score ?? 0);
  const average_quality = scores.reduce((a, b) => a + b, 0) / scores.length;

  const source_breakdown: Record<SourceType, number> = { academic: 0, government: 0, news: 0, industry: 0, blog: 0, unknown: 0 };
  citations.forEach(c => {
    const st = c.evidence_quality?.source_type ?? 'unknown';
    source_breakdown[st]++;
  });

  const strongest_source_type = (Object.entries(source_breakdown) as [SourceType, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  return { average_quality, source_breakdown, strongest_source_type };
}
