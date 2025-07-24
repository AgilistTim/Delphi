import { Citation } from '../types/index.js';

export function sanitizeCitations(citations: any[]): Citation[] {
  return (citations || []).map((citation: any, index: number) => {
    if (typeof citation === 'string') {
      return {
        title: `Source ${index + 1}`,
        url: citation,
        date: undefined,
        relevance: 'High',
      };
    }
    return {
      title: typeof citation.title === 'string' ? citation.title : `Source ${index + 1}`,
      url: typeof citation.url === 'string' ? citation.url : '',
      date: typeof citation.date === 'string' ? citation.date : undefined,
      relevance: typeof citation.relevance === 'string' ? citation.relevance : undefined,
    };
  });
} 