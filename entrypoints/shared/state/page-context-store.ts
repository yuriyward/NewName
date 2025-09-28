/**
 * Runtime page context storage and management
 */
export interface PageContext {
  title?: string;
  heading?: string;
  linkText?: string;
  linkRel?: string;
  capturedAt: number;
  url?: string;
}

const CONTEXT_CACHE = new Map<number, PageContext>();
const URL_CONTEXT_CACHE = new Map<string, PageContext>();
const MAX_CONTEXT_AGE_MS = 5 * 60 * 1000; // 5 minutes

function normalizeUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

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
  url?: string,
): void {
  if (!Number.isFinite(tabId)) return;
  const existing = CONTEXT_CACHE.get(tabId);
  const normalizedUrl = normalizeUrl(url ?? context.url);
  const merged = mergeContext(existing, {
    ...context,
    ...(normalizedUrl ? { url: normalizedUrl } : {}),
  });
  CONTEXT_CACHE.set(tabId, merged);
  if (normalizedUrl) {
    if (existing?.url && existing.url !== normalizedUrl) {
      const stored = URL_CONTEXT_CACHE.get(existing.url);
      if (stored === existing) {
        URL_CONTEXT_CACHE.delete(existing.url);
      }
    }
    URL_CONTEXT_CACHE.set(normalizedUrl, merged);
  }
}

export function updatePageContextByUrl(
  url: string,
  context: Partial<PageContext>,
): void {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl) return;
  const existing = URL_CONTEXT_CACHE.get(normalizedUrl);
  const merged = mergeContext(existing, {
    ...context,
    url: normalizedUrl,
  });
  URL_CONTEXT_CACHE.set(normalizedUrl, merged);
}

export function getPageContext(
  tabId: number | undefined | null,
): PageContext | null {
  if (tabId === undefined || tabId === null) return null;
  const context = CONTEXT_CACHE.get(tabId);
  if (!context) return null;
  if (Date.now() - context.capturedAt > MAX_CONTEXT_AGE_MS) {
    CONTEXT_CACHE.delete(tabId);
    if (context.url) {
      const stored = URL_CONTEXT_CACHE.get(context.url);
      if (stored === context) {
        URL_CONTEXT_CACHE.delete(context.url);
      }
    }
    return null;
  }
  return context;
}

export function clearPageContext(tabId: number): void {
  const existing = CONTEXT_CACHE.get(tabId);
  if (!existing) return;
  CONTEXT_CACHE.delete(tabId);
  if (existing.url) {
    const stored = URL_CONTEXT_CACHE.get(existing.url);
    if (stored === existing) {
      URL_CONTEXT_CACHE.delete(existing.url);
    }
  }
}

export function pruneStaleContexts(): void {
  const cutoff = Date.now() - MAX_CONTEXT_AGE_MS;
  for (const [tabId, context] of CONTEXT_CACHE.entries()) {
    if (context.capturedAt < cutoff) {
      CONTEXT_CACHE.delete(tabId);
      if (context.url) {
        const stored = URL_CONTEXT_CACHE.get(context.url);
        if (stored === context) {
          URL_CONTEXT_CACHE.delete(context.url);
        }
      }
    }
  }

  for (const [url, context] of URL_CONTEXT_CACHE.entries()) {
    if (context.capturedAt < cutoff) {
      URL_CONTEXT_CACHE.delete(url);
    }
  }
}

export function getPageContextByUrl(
  url: string | undefined | null,
): PageContext | null {
  const normalized = normalizeUrl(url);
  if (!normalized) return null;
  const context = URL_CONTEXT_CACHE.get(normalized);
  if (!context) return null;
  if (Date.now() - context.capturedAt > MAX_CONTEXT_AGE_MS) {
    URL_CONTEXT_CACHE.delete(normalized);
    return null;
  }
  return context;
}
