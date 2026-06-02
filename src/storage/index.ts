import { Store } from './types.js';
import { FilesystemStore } from './filesystem.js';
import { SupabaseStore } from './supabase.js';

export type { Store, StoredReportSummary } from './types.js';

let cached: Store | null = null;

/**
 * Returns the configured storage backend (memoised).
 *
 * DELPHI_STORE=supabase  -> SupabaseStore (hosted web deployment)
 * DELPHI_STORE=fs | unset -> FilesystemStore (CLI / local dev, default)
 */
export function getStore(): Store {
  if (cached) return cached;
  const backend = (process.env.DELPHI_STORE || 'fs').toLowerCase();
  cached = backend === 'supabase' ? new SupabaseStore() : new FilesystemStore();
  return cached;
}

/** Test helper: reset the memoised store (e.g. between unit tests). */
export function __resetStore(): void {
  cached = null;
}
