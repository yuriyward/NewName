/**
 * Queue manager for sequential media analysis requests
 */
import { browser } from 'wxt/browser';
import { logMediaDebug } from '@/entrypoints/shared/integrations/mediainfo/debug';
import type {
  MediaAnalysisRequest,
  MediaAnalysisResponse,
} from '@/entrypoints/shared/integrations/mediainfo/messages';
import { requestMediaAnalysis } from '@/entrypoints/shared/messaging/media-messages';
import { ensureOffscreenReady } from './offscreen-coordinator';

interface MediaAnalysisJob {
  readonly request: MediaAnalysisRequest;
  readonly resolve: (response: MediaAnalysisResponse) => void;
  readonly reject: (error: unknown) => void;
}

const queue: MediaAnalysisJob[] = [];
let processing = false;

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
    });
    queue.push({ request, resolve, reject });
    void processQueue();
  });
}

export function resetMediaAnalysisQueueForTesting(): void {
  queue.length = 0;
  processing = false;
}
