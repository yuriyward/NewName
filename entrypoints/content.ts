/**
 * Content script for page context extraction and messaging
 */

import {
  createContextUpdater,
  firstHeading,
  truncate,
} from '@/entrypoints/shared/context/context-updater';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { requestPendingConfirmToasts } from '@/entrypoints/shared/messaging/core-messages';
import {
  onExtensionMessage,
  sendExtensionMessage,
} from '@/entrypoints/shared/messaging/extension-messaging';
import { getSettings } from '@/entrypoints/shared/settings/settings';
import {
  type ConfirmToastManager,
  getConfirmToastManager,
} from '@/entrypoints/shared/ui/confirm-toast-manager';

const PAGE_CONTEXT_REFRESH_INTERVAL_MS = 2 * 60_000;

const contextUpdater = createContextUpdater();
let contextRefreshTimer: ReturnType<typeof setInterval> | undefined;
let lastContextPublishTimestamp = 0;
let isContextInvalidated = false;

// Cached consent status to avoid frequent storage reads
let cachedConsentGranted: boolean | null = null;
let consentCacheTimestamp = 0;
const CONSENT_CACHE_TTL_MS = 30_000; // 30 seconds

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

interface PageContextSnapshot {
  title?: string;
  heading?: string;
}

let lastPublishedContext: PageContextSnapshot = {
  title: undefined,
  heading: undefined,
};

/**
 * Check consent status with caching to reduce storage reads.
 * Cache is invalidated after CONSENT_CACHE_TTL_MS or when explicitly refreshed.
 */
async function checkConsentWithCache(): Promise<boolean> {
  const now = Date.now();
  if (
    cachedConsentGranted !== null &&
    now - consentCacheTimestamp < CONSENT_CACHE_TTL_MS
  ) {
    return cachedConsentGranted;
  }

  try {
    const settings = await getSettings();
    cachedConsentGranted = settings.pageContextConsent.consentGranted;
    consentCacheTimestamp = now;
    return cachedConsentGranted;
  } catch (error) {
    debugLogger.error('[PageContext] Failed to check consent', { error });
    // Fail closed - don't capture if we can't check consent
    return false;
  }
}

/**
 * Invalidate consent cache to force a fresh check on next call.
 * Call this when consent settings may have changed.
 */
function _invalidateConsentCache(): void {
  cachedConsentGranted = null;
  consentCacheTimestamp = 0;
}

async function publishPageContext(force = false): Promise<void> {
  // Check if user has consented to page context capture (with caching)
  const consentGranted = await checkConsentWithCache();
  if (!consentGranted) {
    debugLogger.log(
      '[PageContext] Skipping context capture - consent not granted',
    );
    return;
  }

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

  void ensureRuntimeContext().then((runtimeContext) => {
    contextUpdater.dispatchUpdate(
      {
        type: 'PAGE_CONTEXT',
        payload: snapshot,
      },
      runtimeContext,
    );
  });

  lastContextPublishTimestamp = Date.now();
}

function isDocumentVisible(): boolean {
  return document.visibilityState === 'visible';
}

function ensureContextRefreshTimer(): void {
  if (contextRefreshTimer) return;
  if (!isDocumentVisible()) return;
  contextRefreshTimer = setInterval(() => {
    const now = Date.now();
    if (now - lastContextPublishTimestamp >= PAGE_CONTEXT_REFRESH_INTERVAL_MS) {
      publishPageContext(true);
    }
  }, PAGE_CONTEXT_REFRESH_INTERVAL_MS);
}

function clearContextRefreshTimer(): void {
  if (!contextRefreshTimer) return;
  clearInterval(contextRefreshTimer);
  contextRefreshTimer = undefined;
}

function markContextInvalidated(): void {
  if (isContextInvalidated) return;
  isContextInvalidated = true;
  contextUpdater.invalidate();
  clearContextRefreshTimer();
}

function handleVisibilityChange(): void {
  if (!isDocumentVisible()) {
    clearContextRefreshTimer();
    return;
  }

  // Force a refresh when returning to an active tab to avoid stale context
  publishPageContext(true);
  ensureContextRefreshTimer();
}

function handleLinkInteraction(event: Event): void {
  if (!(event.target instanceof Element)) return;
  const anchor = event.target.closest('a');
  if (!anchor) return;
  const linkText = truncate(anchor.textContent);
  const rel = anchor.getAttribute('rel');
  void ensureRuntimeContext().then((runtimeContext) => {
    contextUpdater.dispatchUpdate(
      {
        type: 'LINK_CONTEXT',
        payload: {
          linkText,
          linkRel: rel,
        },
      },
      runtimeContext,
    );
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
  main(ctx) {
    void ensureRuntimeContext().catch(() => {
      // Resolution will be retried by individual updates on demand.
    });
    void syncPendingToasts();
    publishPageContext(true);
    ensureContextRefreshTimer();
    const visibilityListener = () => handleVisibilityChange();
    document.addEventListener('visibilitychange', visibilityListener);
    observeTitle();
    window.addEventListener('click', handleLinkInteraction, true);
    window.addEventListener('auxclick', handleLinkInteraction, true);
    window.addEventListener('contextmenu', handleLinkInteraction, true);
    const pageHideListener = () => markContextInvalidated();
    window.addEventListener('pagehide', pageHideListener);

    ctx.onInvalidated(() => {
      document.removeEventListener('visibilitychange', visibilityListener);
      window.removeEventListener('pagehide', pageHideListener);
      window.removeEventListener('click', handleLinkInteraction, true);
      window.removeEventListener('auxclick', handleLinkInteraction, true);
      window.removeEventListener('contextmenu', handleLinkInteraction, true);
      markContextInvalidated();
    });
  },
});
