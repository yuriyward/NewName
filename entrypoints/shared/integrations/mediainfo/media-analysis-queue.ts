import { browser } from 'wxt/browser';
import { logMediaDebug } from '@/entrypoints/shared/integrations/mediainfo/debug';
import type {
  MediaAnalysisRequest,
  MediaAnalysisResponse,
} from '@/entrypoints/shared/integrations/mediainfo/messages';
import {
  offscreenHandshake,
  onExtensionMessage,
  requestMediaAnalysis,
} from '@/entrypoints/shared/messaging/extension-messaging';

const OFFSCREEN_JUSTIFICATION =
  'Analyze media metadata via MediaInfo in offscreen document';

const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';

function resolveOffscreenUrl(): string {
  if (browser.runtime?.getURL) {
    return browser.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  }
  const extensionRoot = browser.runtime.getURL('/');
  return new URL(OFFSCREEN_DOCUMENT_PATH, extensionRoot).toString();
}

interface MediaAnalysisJob {
  readonly request: MediaAnalysisRequest;
  readonly resolve: (response: MediaAnalysisResponse) => void;
  readonly reject: (error: unknown) => void;
}

const queue: MediaAnalysisJob[] = [];
let processing = false;
let ensureOffscreenPromise: Promise<void> | null = null;
let readyPromise: Promise<void> | null = null;
let readySignalTimestamp: number | null = null;

// Listen for offscreenReady signals from offscreen document
onExtensionMessage('offscreenReady', ({ data }) => {
  readySignalTimestamp = typeof data?.ts === 'number' ? data.ts : Date.now();
  logMediaDebug(undefined, 'offscreen-ready-signal', {
    ts: readySignalTimestamp,
  });
  return { ok: true as const };
});

async function ensureOffscreenDocument(
  debug?: MediaAnalysisRequest['debug'],
): Promise<void> {
  if (ensureOffscreenPromise) {
    logMediaDebug(debug, 'offscreen-create-promise-reuse', {
      pending: true,
      queueLength: queue.length,
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
      queueLength: queue.length,
      pendingReadyPromise: readyPromise !== null,
    });

    if (hasDocumentBefore) {
      logMediaDebug(debug, 'offscreen-already-exists', {
        hasDocument: hasDocumentBefore,
        queueLength: queue.length,
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
        queueLength: queue.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logMediaDebug(debug, 'offscreen-create-failed', {
        error: message,
        stack: error instanceof Error ? error.stack : undefined,
        url,
        queueLength: queue.length,
      });
      throw new Error(`Failed to create offscreen document: ${message}`);
    }
  })().catch((error) => {
    ensureOffscreenPromise = null;
    throw error;
  });

  return ensureOffscreenPromise;
}

async function ensureOffscreenReady(
  debug?: MediaAnalysisRequest['debug'],
): Promise<void> {
  if (readyPromise) return readyPromise;

  const MAX_RETRIES = 3;
  const BACKOFF_MS = 200;

  readyPromise = (async () => {
    await ensureOffscreenDocument(debug);

    // Wait longer for the offscreen document to fully initialize and load scripts
    // This is especially important in dev mode where modules load from dev server
    await new Promise((resolve) => setTimeout(resolve, 300));

    // If we never saw a ready signal, wait longer for it
    if (readySignalTimestamp === null) {
      logMediaDebug(debug, 'offscreen-ready-signal-wait');
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    logMediaDebug(debug, 'offscreen-handshake-loop-start', {
      maxRetries: MAX_RETRIES + 1,
      queueLength: queue.length,
      ensureOffscreenPending: ensureOffscreenPromise !== null,
    });

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const start = performance.now();
        const offscreenApi = browser.offscreen;
        const hasDocument = await offscreenApi?.hasDocument?.();
        logMediaDebug(debug, 'offscreen-handshake-attempt', {
          attempt,
          maxRetries: MAX_RETRIES,
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
            queueLength: queue.length,
          });
          return;
        } else {
          throw new Error('Handshake returned invalid response');
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        logMediaDebug(debug, 'offscreen-handshake-error', {
          attempt,
          error: message,
          stack: error instanceof Error ? error.stack : undefined,
          willRetry: attempt < MAX_RETRIES,
        });

        if (attempt === MAX_RETRIES) {
          throw new Error(
            `Offscreen handshake failed after ${MAX_RETRIES + 1} attempts: ${message}`,
          );
        }

        const delay = BACKOFF_MS * 2 ** attempt;
        logMediaDebug(debug, 'offscreen-ready-retry', {
          attempt,
          delayMs: delay,
          nextAttemptIn: delay,
          queueLength: queue.length,
        });
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  })().catch((error) => {
    readyPromise = null;
    throw error;
  });

  return readyPromise;
}

async function runJob(job: MediaAnalysisJob): Promise<void> {
  const { request } = job;
  try {
    // Ensure offscreen document and WASM are ready
    await ensureOffscreenReady(request.debug);

    // Double-check that we have a valid offscreen document
    const offscreenApi = browser.offscreen;
    const hasDocument = await offscreenApi?.hasDocument?.();
    if (!hasDocument) {
      throw new Error('Offscreen document not found after handshake');
    }

    logMediaDebug(request.debug, 'queue-dispatch', {
      requestId: request.requestId,
      url: request.url,
      hasDocument: !!hasDocument,
      queueLength: queue.length,
    });

    const response = await requestMediaAnalysis(request);
    logMediaDebug(request.debug, 'queue-dispatch-success', {
      requestId: request.requestId,
      status: response.status,
    });
    job.resolve(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logMediaDebug(request.debug, 'queue-dispatch-error', {
      requestId: request.requestId,
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
      queueLength: queue.length,
    });
    job.reject(error);
  }
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  logMediaDebug(undefined, 'queue-processing-start', {
    queueLength: queue.length,
  });
  try {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) {
        break;
      }
      await runJob(job);
    }
  } finally {
    processing = false;
    logMediaDebug(undefined, 'queue-processing-complete', {
      queueLength: queue.length,
    });
  }
}

export function enqueueMediaAnalysis(
  request: MediaAnalysisRequest,
): Promise<MediaAnalysisResponse> {
  return new Promise<MediaAnalysisResponse>((resolve, reject) => {
    logMediaDebug(request.debug, 'queue-enqueue', {
      requestId: request.requestId,
      queueLengthBefore: queue.length,
      ensureOffscreenPending: ensureOffscreenPromise !== null,
      readyPromisePending: readyPromise !== null,
    });
    queue.push({ request, resolve, reject });
    void processQueue();
  });
}

export function resetMediaAnalysisQueueForTesting(): void {
  queue.length = 0;
  processing = false;
  ensureOffscreenPromise = null;
  readyPromise = null;
}
