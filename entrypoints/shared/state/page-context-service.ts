/**
 * Proxy service exposing PageContext store operations to other extension contexts.
 */
import { defineProxyService } from '@webext-core/proxy-service';
import type { PageContext } from '@/entrypoints/shared/state/page-context-store';
import {
  clearPageContext,
  getPageContext,
  getPageContextByUrl,
  pruneStaleContexts,
  updatePageContext,
  updatePageContextByUrl,
} from '@/entrypoints/shared/state/page-context-store';

export interface PageContextPublishRequest {
  tabId: number | null | undefined;
  url?: string | null;
  context: Partial<Omit<PageContext, 'capturedAt'>>;
}

export interface PageContextReadRequest {
  tabId?: number | null;
  url?: string | null;
}

export interface PageContextService {
  publish(request: PageContextPublishRequest): Promise<void>;
  clear(tabId: number): Promise<void>;
  read(request: PageContextReadRequest): Promise<PageContext | null>;
  prune(): Promise<void>;
}

export const [registerPageContextService, getPageContextService] =
  defineProxyService(
    'PageContextService',
    (): PageContextService => ({
      async publish({ tabId, url, context }) {
        const normalizedUrl = typeof url === 'string' ? url : undefined;
        if (typeof tabId === 'number' && Number.isFinite(tabId)) {
          updatePageContext(tabId, context, normalizedUrl);
          return;
        }
        if (normalizedUrl) {
          updatePageContextByUrl(normalizedUrl, context);
        }
      },
      async clear(tabId) {
        if (typeof tabId === 'number' && Number.isFinite(tabId)) {
          clearPageContext(tabId);
        }
      },
      async read({ tabId, url }) {
        if (typeof tabId === 'number' && Number.isFinite(tabId)) {
          const context = getPageContext(tabId);
          if (context) {
            return context;
          }
        }
        if (typeof url === 'string' && url.length > 0) {
          return getPageContextByUrl(url);
        }
        return null;
      },
      async prune() {
        pruneStaleContexts();
      },
    }),
  );
