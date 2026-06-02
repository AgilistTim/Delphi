// DELPHI_ENGINE_URL may be a bare host (e.g. Render's `fromService` host value)
// or a full URL. Normalise to an absolute https URL when no scheme is present.
function resolveEngineBase(): string {
  const raw = process.env.DELPHI_ENGINE_URL || 'http://localhost:3003';
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, '');
  return `https://${raw.replace(/\/$/, '')}`;
}

const ENGINE_BASE = resolveEngineBase();

export async function engineFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${ENGINE_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {})
    },
    // next-specific: never cache engine responses
    cache: 'no-store'
  });
  return res;
}

export async function startRun(body: {
  question: string;
  context?: string;
  experts?: number;
  rounds?: number;
  user_id?: string | null;
}) {
  const res = await engineFetch('/api/v1/analyze', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Engine refused run: ${res.status} ${text}`);
  }
  return res.json() as Promise<{ run_id: string; status: string }>;
}

export async function getRun(id: string) {
  const res = await engineFetch(`/api/v1/runs/${encodeURIComponent(id)}`, { method: 'GET' });
  if (!res.ok) return null;
  return res.json() as Promise<{
    run_id: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    question: string;
    started_at: number;
    completed_at?: number;
    report?: any;
    error?: string;
  }>;
}
