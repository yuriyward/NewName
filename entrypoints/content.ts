/**
 * Content script for page context extraction and messaging
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { requestPendingConfirmToasts } from '@/entrypoints/shared/messaging/core-messages';
import {
  onExtensionMessage,
  sendExtensionMessage,
} from '@/entrypoints/shared/messaging/extension-messaging';
import type { PageContextPublishRequest } from '@/entrypoints/shared/state/page-context-service';
import { getPageContextService } from '@/entrypoints/shared/state/page-context-service';
import {
  type ConfirmToastManager,
  getConfirmToastManager,
} from '@/entrypoints/shared/ui/confirm-toast-manager';

const MAX_IMMEDIATE_SEND_ATTEMPTS = 3;
const MAX_TOTAL_SEND_ATTEMPTS = 6;
const RETRY_BASE_DELAY_MS = 75;
const QUEUED_RETRY_DELAY_MS = 1_000;
const PAGE_CONTEXT_REFRESH_INTERVAL_MS = 2 * 60_000;

type ContextUpdate =
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
  attempts: number;
}

let pendingUpdates: PendingUpdate[] = [];
let pendingFlushTimer: ReturnType<typeof setTimeout> | undefined;
let contextRefreshTimer: ReturnType<typeof setInterval> | undefined;
let lastContextPublishTimestamp = 0;

interface RuntimeContext {
  tabId?: number;
  frameId?: number;
  url?: string | null;
}

let resolvedRuntimeContext: RuntimeContext | null = null;
let runtimeContextPromise: Promise<RuntimeContext> | null = null;

let toastManager: ConfirmToastManager | null = null;

function ensureToastManager(): ConfirmToastManager {
  if (!toastManager) {
    toastManager = getConfirmToastManager();
  }
  return toastManager;
}

onExtensionMessage('showConfirmToast', async ({ data }) => {
  ensureToastManager().showToast(data.proposal);
  return { ok: true };
});

onExtensionMessage('updateConfirmToastTiming', async ({ data }) => {
  ensureToastManager().updateTiming(data);
  return { ok: true };
});

onExtensionMessage('confirmToastStatus', async ({ data }) => {
  ensureToastManager().updateStatus(data);
  return { ok: true };
});

onExtensionMessage('showRenameToast', async ({ data }) => {
  debugLogger.log('[NewName] Content showing rename toast', data.toast);
  ensureToastManager().showRenameResult(data.toast);
  return { ok: true };
});

async function syncPendingToasts(): Promise<void> {
  try {
    const { proposals } = await requestPendingConfirmToasts();
    if (proposals.length === 0) {
      return;
    }
    const manager = ensureToastManager();
    for (const proposal of proposals) {
      manager.showToast(proposal);
    }
  } catch (error) {
    debugLogger.warn('[ConfirmToast] Failed to sync pending toasts', error);
  }
}

async function ensureRuntimeContext(): Promise<RuntimeContext> {
  if (resolvedRuntimeContext) return resolvedRuntimeContext;
  if (!runtimeContextPromise) {
    runtimeContextPromise = sendExtensionMessage('resolveRuntimeContext')
      .then((context) => {
        resolvedRuntimeContext = context;
        runtimeContextPromise = null;
        return context;
      })
      .catch((error) => {
        runtimeContextPromise = null;
        throw error;
      });
  }
  return runtimeContextPromise;
}

function schedulePendingFlush(): void {
  if (pendingFlushTimer !== undefined) return;
  pendingFlushTimer = setTimeout(() => {
    pendingFlushTimer = undefined;
    flushPendingUpdates();
  }, QUEUED_RETRY_DELAY_MS);
}

function flushPendingUpdates(): void {
  if (pendingUpdates.length === 0) return;
  const queue = pendingUpdates;
  pendingUpdates = [];
  for (const entry of queue) {
    sendUpdateWithRetry(entry.update, entry.attempts);
  }
}

function firstHeading(): string | undefined {
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

function truncate(
  value: string | null | undefined,
  max = 160,
): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

async function performContextUpdate(update: ContextUpdate): Promise<void> {
  const runtimeContext = await ensureRuntimeContext();
  const tabId =
    typeof runtimeContext.tabId === 'number' ? runtimeContext.tabId : null;
  const url = document.location.href;

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

function sendUpdateWithRetry(update: ContextUpdate, attempts = 0): void {
  const nextAttempt = attempts + 1;
  void performContextUpdate(update).catch((error) => {
    if (nextAttempt >= MAX_TOTAL_SEND_ATTEMPTS) {
      debugLogger.warn('Dropping page context update after repeated failures', {
        update,
        error,
      });
      return;
    }

    if (nextAttempt < MAX_IMMEDIATE_SEND_ATTEMPTS) {
      const delay = RETRY_BASE_DELAY_MS * 2 ** (nextAttempt - 1);
      setTimeout(() => {
        sendUpdateWithRetry(update, nextAttempt);
      }, delay);
      return;
    }

    pendingUpdates.push({ update, attempts: nextAttempt });
    schedulePendingFlush();
  });
}

function dispatchUpdate(update: ContextUpdate): void {
  flushPendingUpdates();
  sendUpdateWithRetry(update);
}

interface PageContextSnapshot {
  title?: string;
  heading?: string;
}

let lastPublishedContext: PageContextSnapshot = {
  title: undefined,
  heading: undefined,
};

function publishPageContext(force = false): void {
  const snapshot: PageContextSnapshot = {
    title: truncate(document.title),
    heading: firstHeading(),
  };

  if (
    !force &&
    snapshot.title === lastPublishedContext.title &&
    snapshot.heading === lastPublishedContext.heading
  ) {
    return;
  }

  lastPublishedContext = { ...snapshot };

  dispatchUpdate({
    type: 'PAGE_CONTEXT',
    payload: snapshot,
  });

  lastContextPublishTimestamp = Date.now();
}

function ensureContextRefreshTimer(): void {
  if (contextRefreshTimer) return;
  contextRefreshTimer = setInterval(() => {
    const now = Date.now();
    if (now - lastContextPublishTimestamp >= PAGE_CONTEXT_REFRESH_INTERVAL_MS) {
      publishPageContext(true);
    }
  }, PAGE_CONTEXT_REFRESH_INTERVAL_MS);
}

function handleLinkInteraction(event: Event): void {
  if (!(event.target instanceof Element)) return;
  const anchor = event.target.closest('a');
  if (!anchor) return;
  const linkText = truncate(anchor.textContent);
  const rel = anchor.getAttribute('rel');
  dispatchUpdate({
    type: 'LINK_CONTEXT',
    payload: {
      linkText,
      linkRel: rel,
    },
  });
}

function observeTitle(): void {
  const titleElement = document.head?.querySelector('title');
  if (!titleElement) return;
  const observer = new MutationObserver(() => {
    const nextTitle = truncate(document.title);
    if (nextTitle === lastPublishedContext.title) {
      return;
    }
    publishPageContext();
  });
  observer.observe(titleElement, {
    characterData: true,
    childList: true,
    subtree: true,
  });
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    void ensureRuntimeContext().catch(() => {
      // Resolution will be retried by individual updates on demand.
    });
    void syncPendingToasts();
    publishPageContext(true);
    ensureContextRefreshTimer();
    observeTitle();
    window.addEventListener('click', handleLinkInteraction, true);
    window.addEventListener('auxclick', handleLinkInteraction, true);
    window.addEventListener('contextmenu', handleLinkInteraction, true);
  },
});
