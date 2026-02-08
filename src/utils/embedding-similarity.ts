import OpenAI from 'openai';

let openaiInstance: OpenAI | null = null;

export function setOpenAIInstance(openai: OpenAI): void {
  openaiInstance = openai;
}

export async function getEmbedding(text: string): Promise<number[]> {
  if (!openaiInstance) {
    throw new Error('OpenAI instance not set. Call setOpenAIInstance first.');
  }

  try {
    const response = await openaiInstance.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000)
    });
    return response.data[0].embedding;
  } catch (error) {
    console.warn('Embedding generation failed, falling back to word overlap:', error);
    return [];
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return -1;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

export async function semanticSimilarity(textA: string, textB: string): Promise<number> {
  const [embA, embB] = await Promise.all([
    getEmbedding(textA),
    getEmbedding(textB)
  ]);

  const similarity = cosineSimilarity(embA, embB);

  if (similarity < 0) {
    return wordOverlapFallback(textA, textB);
  }

  return similarity;
}

function wordOverlapFallback(textA: string, textB: string): number {
  const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(textB.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const overlap = new Set([...wordsA].filter(w => wordsB.has(w)));
  return overlap.size / Math.max(wordsA.size, wordsB.size);
}
