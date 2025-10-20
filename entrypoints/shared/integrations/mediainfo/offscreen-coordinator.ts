/**
 * Offscreen document lifecycle and readiness coordination
 */
import { browser } from 'wxt/browser';
import { logMediaDebug } from '@/entrypoints/shared/integrations/mediainfo/debug';
import type { MediaAnalysisRequest } from '@/entrypoints/shared/integrations/mediainfo/messages';
import { offscreenHandshake } from '@/entrypoints/shared/messaging/core-messages';
import { onExtensionMessage } from '@/entrypoints/shared/messaging/extension-messaging';
import {
  OFFSCREEN_HANDSHAKE_BACKOFF_MS,
  OFFSCREEN_HANDSHAKE_MAX_RETRIES,
} from './constants';

const OFFSCREEN_JUSTIFICATION =
  'Analyze media metadata via MediaInfo in offscreen document';

const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';

let ensureOffscreenPromise: Promise<void> | null = null;
let readyPromise: Promise<void> | null = null;
let readySignalTimestamp: number | null = null;
const readySignalWaiters = new Set<() => void>();

/**
 * Resolve the offscreen document URL.
 */
function resolveOffscreenUrl(): string {
  if (browser.runtime?.getURL) {
    return browser.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  }
  const extensionRoot = browser.runtime.getURL('/');
  return new URL(OFFSCREEN_DOCUMENT_PATH, extensionRoot).toString();
}

/**
 * Listen for offscreenReady signals from offscreen document.
 */
onExtensionMessage('offscreenReady', ({ data }) => {
  readySignalTimestamp = typeof data?.ts === 'number' ? data.ts : Date.now();
  logMediaDebug(undefined, 'offscreen-ready-signal', {
    ts: readySignalTimestamp,
  });
  for (const notify of readySignalWaiters) {
    notify();
  }
  readySignalWaiters.clear();
  return { ok: true as const };
});

/**
 * Wait for a ready signal from the offscreen document.
 */
function waitForReadySignal(timeoutMs: number): Promise<void> {
  if (readySignalTimestamp !== null) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timeout = setTimeout(
      () => {
        readySignalWaiters.delete(onSignal);
        resolve();
      },
      Math.max(0, timeoutMs),
    );
    const onSignal = () => {
      clearTimeout(timeout);
      readySignalWaiters.delete(onSignal);
      resolve();
    };
    readySignalWaiters.add(onSignal);
  });
}

/**
 * Ensure the offscreen document is created.
 */
async function ensureOffscreenDocument(
  debug?: MediaAnalysisRequest['debug'],
): Promise<void> {
  if (ensureOffscreenPromise) {
    logMediaDebug(debug, 'offscreen-create-promise-reuse', {
      pending: true,
      readyPromiseActive: readyPromise !== null,
    });
    return ensureOffscreenPromise;
  }

  ensureOffscreenPromise = (async () => {
    const offscreenApi = browser.offscreen;
    if (!offscreenApi?.createDocument) {
      logMediaDebug(debug, 'offscreen-api-unavailable', {
        hasOffscreen: !!offscreenApi,
        hasCreateDocument: !!offscreenApi?.createDocument,
      });
      throw new Error('Offscreen document API unavailable');
    }

    const hasDocumentBefore = await offscreenApi.hasDocument?.();
    logMediaDebug(debug, 'offscreen-create-start', {
      hasApi: !!offscreenApi.createDocument,
      hasHasDocument: !!offscreenApi.hasDocument,
      hasDocumentBefore,
      pendingReadyPromise: readyPromise !== null,
    });

    if (hasDocumentBefore) {
      logMediaDebug(debug, 'offscreen-already-exists', {
        hasDocument: hasDocumentBefore,
      });
      return;
    }

    const url = resolveOffscreenUrl();
    try {
      logMediaDebug(debug, 'offscreen-create-call', { url });
      await offscreenApi.createDocument({
        url,
        reasons: ['BLOBS'],
        justification: OFFSCREEN_JUSTIFICATION,
      });
      const hasDocumentAfter = await offscreenApi.hasDocument?.();
      logMediaDebug(debug, 'offscreen-created', {
        url,
        hasDocumentAfter,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logMediaDebug(debug, 'offscreen-create-failed', {
        error: message,
        stack: error instanceof Error ? error.stack : undefined,
        url,
      });
      throw new Error(`Failed to create offscreen document: ${message}`);
    }
  })().catch((error) => {
    ensureOffscreenPromise = null;
    throw error;
  });

  return ensureOffscreenPromise;
}

/**
 * Ensure the offscreen document is ready with MediaInfo initialized.
 */
export async function ensureOffscreenReady(
  debug?: MediaAnalysisRequest['debug'],
): Promise<void> {
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    await ensureOffscreenDocument(debug);

    logMediaDebug(debug, 'offscreen-handshake-loop-start', {
      maxRetries: OFFSCREEN_HANDSHAKE_MAX_RETRIES + 1,
      ensureOffscreenPending: ensureOffscreenPromise !== null,
    });

    for (
      let attempt = 0;
      attempt <= OFFSCREEN_HANDSHAKE_MAX_RETRIES;
      attempt++
    ) {
      try {
        const start = performance.now();
        const offscreenApi = browser.offscreen;
        const hasDocument = await offscreenApi?.hasDocument?.();
        logMediaDebug(debug, 'offscreen-handshake-attempt', {
          attempt,
          maxRetries: OFFSCREEN_HANDSHAKE_MAX_RETRIES,
          hasDocument,
          readyPromiseReused: attempt > 0,
          hasSender: debug?.enabled ?? false,
          ensureOffscreenPending: ensureOffscreenPromise !== null,
        });

        const res = await offscreenHandshake();
        if (res?.ready) {
          const hasDocumentAfter = await offscreenApi?.hasDocument?.();
          logMediaDebug(debug, 'offscreen-ready', {
            attempt,
            elapsedMs: Math.round(performance.now() - start),
            hasDocumentAfter,
          });
          return;
        }
        throw new Error('Handshake returned invalid response');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        logMediaDebug(debug, 'offscreen-handshake-error', {
          attempt,
          error: message,
          stack: error instanceof Error ? error.stack : undefined,
          willRetry: attempt < OFFSCREEN_HANDSHAKE_MAX_RETRIES,
        });

        if (attempt === OFFSCREEN_HANDSHAKE_MAX_RETRIES) {
          throw new Error(
            `Offscreen handshake failed after ${OFFSCREEN_HANDSHAKE_MAX_RETRIES + 1} attempts: ${message}`,
          );
        }

        const delay = OFFSCREEN_HANDSHAKE_BACKOFF_MS * 2 ** attempt;
        logMediaDebug(debug, 'offscreen-ready-retry', {
          attempt,
          delayMs: delay,
          nextAttemptIn: delay,
        });
        await waitForReadySignal(delay);
      }
    }
  })().catch((error) => {
    readyPromise = null;
    throw error;
  });

  return readyPromise;
}

/**
 * Reset coordinator state for testing.
 */
export function resetOffscreenCoordinatorForTesting(): void {
  ensureOffscreenPromise = null;
  readyPromise = null;
  readySignalTimestamp = null;
  readySignalWaiters.clear();
}
