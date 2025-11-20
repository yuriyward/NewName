/**
 * Context update logic for content script
 * Handles queuing, retrying, and dispatching page context updates
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { PageContextPublishRequest } from '@/entrypoints/shared/state/page-context-service';
import { getPageContextService } from '@/entrypoints/shared/state/page-context-service';

const MAX_IMMEDIATE_SEND_ATTEMPTS = 3;
const MAX_TOTAL_SEND_ATTEMPTS = 6;
const RETRY_BASE_DELAY_MS = 75;
const QUEUED_RETRY_DELAY_MS = 1_000;

export type ContextUpdate =
  | {
      type: 'PAGE_CONTEXT';
      payload: {
        title?: string;
        heading?: string;
      };
    }
  | {
      type: 'LINK_CONTEXT';
      payload: {
        linkText?: string;
        linkRel?: string | null;
      };
    };

interface PendingUpdate {
  update: ContextUpdate;
  runtimeContext: RuntimeContext;
  attempts: number;
}

interface RuntimeContext {
  tabId?: number;
  frameId?: number;
  url?: string | null;
}

export interface ContextUpdater {
  dispatchUpdate(update: ContextUpdate, runtimeContext: RuntimeContext): void;
  invalidate(): void;
}

class ContextUpdaterImpl implements ContextUpdater {
  private pendingUpdates: PendingUpdate[] = [];
  private pendingFlushTimer: ReturnType<typeof setTimeout> | undefined;
  private isInvalidated = false;

  private schedulePendingFlush(): void {
    if (this.isInvalidated || this.pendingFlushTimer !== undefined) return;
    this.pendingFlushTimer = setTimeout(() => {
      this.pendingFlushTimer = undefined;
      this.flushPendingUpdates();
    }, QUEUED_RETRY_DELAY_MS);
  }

  private flushPendingUpdates(): void {
    if (this.isInvalidated || this.pendingUpdates.length === 0) return;
    const queue = this.pendingUpdates;
    this.pendingUpdates = [];
    for (const entry of queue) {
      this.sendUpdateWithRetry(
        entry.update,
        entry.runtimeContext,
        entry.attempts,
      );
    }
  }

  private async performContextUpdate(
    update: ContextUpdate,
    runtimeContext: RuntimeContext,
  ): Promise<void> {
    const tabId =
      typeof runtimeContext.tabId === 'number' ? runtimeContext.tabId : null;
    const url = typeof document !== 'undefined' ? document.location.href : '';

    const request: PageContextPublishRequest =
      update.type === 'PAGE_CONTEXT'
        ? {
            tabId,
            url,
            context: {
              title: update.payload.title,
              heading: update.payload.heading,
            },
          }
        : {
            tabId,
            url,
            context: {
              linkText: update.payload.linkText,
              linkRel: update.payload.linkRel ?? undefined,
            },
          };

    await getPageContextService().publish(request);
  }

  private sendUpdateWithRetry(
    update: ContextUpdate,
    runtimeContext: RuntimeContext,
    attempts = 0,
  ): void {
    const nextAttempt = attempts + 1;
    void this.performContextUpdate(update, runtimeContext).catch((error) => {
      if (nextAttempt >= MAX_TOTAL_SEND_ATTEMPTS) {
        debugLogger.warn(
          'Dropping page context update after repeated failures',
          {
            update,
            error,
          },
        );
        return;
      }

      if (nextAttempt < MAX_IMMEDIATE_SEND_ATTEMPTS) {
        const delay = RETRY_BASE_DELAY_MS * 2 ** (nextAttempt - 1);
        setTimeout(() => {
          this.sendUpdateWithRetry(update, runtimeContext, nextAttempt);
        }, delay);
        return;
      }

      this.pendingUpdates.push({
        update,
        runtimeContext,
        attempts: nextAttempt,
      });
      this.schedulePendingFlush();
    });
  }

  dispatchUpdate(update: ContextUpdate, runtimeContext: RuntimeContext): void {
    if (this.isInvalidated) return;
    this.flushPendingUpdates();
    this.sendUpdateWithRetry(update, runtimeContext);
  }

  invalidate(): void {
    if (this.isInvalidated) return;
    this.isInvalidated = true;
    this.pendingUpdates = [];
    if (this.pendingFlushTimer !== undefined) {
      clearTimeout(this.pendingFlushTimer);
      this.pendingFlushTimer = undefined;
    }
  }
}

export function createContextUpdater(): ContextUpdater {
  return new ContextUpdaterImpl();
}

export function firstHeading(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const root = document.body ?? document.documentElement;
  if (!root) return undefined;

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
    (node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return NodeFilter.FILTER_SKIP;
      }
      const element = node as HTMLElement;
      const tagName = element.tagName;
      if (tagName !== 'H1' && tagName !== 'H2') {
        return NodeFilter.FILTER_SKIP;
      }
      const text = element.textContent?.trim();
      if (!text || text.length <= 4) {
        return NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  );

  const heading = walker.nextNode();
  if (!(heading instanceof HTMLElement)) {
    return undefined;
  }

  const text = heading.textContent?.trim();
  return text ? truncate(text) : undefined;
}

export function truncate(
  value: string | null | undefined,
  max = 160,
): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
