/**
 * Runtime page context storage and management
 */
export interface PageContext {
  title?: string;
  heading?: string;
  linkText?: string;
  linkRel?: string;
  capturedAt: number;
}

const CONTEXT_CACHE = new Map<number, PageContext>();
const MAX_CONTEXT_AGE_MS = 5 * 60 * 1000; // 5 minutes

function mergeContext(
  existing: PageContext | undefined,
  update: Partial<PageContext>,
): PageContext {
  return {
    ...(existing ?? { capturedAt: Date.now() }),
    ...update,
    capturedAt: Date.now(),
  };
}

export function updatePageContext(
  tabId: number,
  context: Partial<PageContext>,
): void {
  if (!Number.isFinite(tabId)) return;
  const existing = CONTEXT_CACHE.get(tabId);
  const merged = mergeContext(existing, context);
  CONTEXT_CACHE.set(tabId, merged);
}

export function getPageContext(
  tabId: number | undefined | null,
): PageContext | null {
  if (tabId === undefined || tabId === null) return null;
  const context = CONTEXT_CACHE.get(tabId);
  if (!context) return null;
  if (Date.now() - context.capturedAt > MAX_CONTEXT_AGE_MS) {
    CONTEXT_CACHE.delete(tabId);
    return null;
  }
  return context;
}

export function clearPageContext(tabId: number): void {
  CONTEXT_CACHE.delete(tabId);
}

export function pruneStaleContexts(): void {
  const cutoff = Date.now() - MAX_CONTEXT_AGE_MS;
  for (const [tabId, context] of CONTEXT_CACHE.entries()) {
    if (context.capturedAt < cutoff) {
      CONTEXT_CACHE.delete(tabId);
    }
  }
}
