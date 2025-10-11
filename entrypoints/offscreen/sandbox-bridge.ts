/**
 * Bridge for communicating with the sandboxed iframe that runs MediaInfo.js.
 * Coordinates analysis requests and response handling.
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { ANALYSIS_TIMEOUT_MS } from '@/entrypoints/shared/integrations/mediainfo/constants';
import { logMediaDebug } from '@/entrypoints/shared/integrations/mediainfo/debug';
import type {
  MediaAnalysisRequest,
  MediaAnalysisResponse,
} from '@/entrypoints/shared/integrations/mediainfo/messages';
import {
  destroySandbox as destroySandboxLifecycle,
  ensureSandboxReady as ensureSandboxReadyInternal,
  getSandboxWindow,
  isFromSandbox,
} from './bridge/sandbox-lifecycle';
import { isSandboxMessage, postToSandbox } from './bridge/sandbox-protocol';
import {
  cleanupReader,
  cleanupStreamingListeners,
  registerStreamingListeners,
} from './bridge/stream-coordinator';

// Re-export for external use
export { ensureSandboxReadyInternal as ensureSandboxReady };

interface PendingRequest {
  resolve: (response: MediaAnalysisResponse) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  debug: MediaAnalysisRequest['debug'];
}

const pendingRequests = new Map<string, PendingRequest>();

/**
 * Fetches media from URL using streaming and analyzes it via sandbox.
 * Stream happens in offscreen context (proper origin for CORS),
 * sandbox coordinates chunk requests via MediaInfo's callback API.
 */
export async function fetchAndAnalyzeFromUrl(
  request: MediaAnalysisRequest,
): Promise<MediaAnalysisResponse> {
  // Ensure sandbox is ready before attempting analysis
  await ensureSandboxReadyInternal();

  const start = performance.now();
  logMediaDebug(request.debug, 'stream-analysis-start', {
    requestId: request.requestId,
    url: request.url,
  });

  try {
    // Request sandbox to analyze using range-based fetch
    const analysisResponse = await new Promise<MediaAnalysisResponse>(
      (resolve, reject) => {
        const timeout = setTimeout(() => {
          pendingRequests.delete(request.requestId);
          // Cleanup reader on timeout
          cleanupReader(request.requestId);
          reject(
            new Error(
              `Sandbox analysis timeout after ${ANALYSIS_TIMEOUT_MS}ms for request ${request.requestId}`,
            ),
          );
        }, ANALYSIS_TIMEOUT_MS);

        pendingRequests.set(request.requestId, {
          resolve,
          reject,
          timeout,
          debug: request.debug,
        });

        postToSandbox(getSandboxWindow(), 'analyze-url-streaming', {
          requestId: request.requestId,
          url: request.url,
          chunkSize: request.chunkSize,
          historyId: request.historyId,
          downloadId: request.downloadId,
          debug: request.debug,
        });
      },
    );

    // Cleanup reader after analysis
    cleanupReader(request.requestId);

    const totalElapsed = performance.now() - start;
    logMediaDebug(request.debug, 'stream-analysis-complete', {
      requestId: request.requestId,
      totalElapsedMs: Math.round(totalElapsed),
      bytesFetched: analysisResponse.metrics?.bytesFetched,
      requests: analysisResponse.metrics?.requests,
    });

    return analysisResponse;
  } catch (error) {
    // Cleanup reader on error
    cleanupReader(request.requestId);

    const elapsed = performance.now() - start;
    const message =
      error instanceof Error ? error.message : 'Streaming analysis failed';
    debugLogger.error(
      '[SandboxBridge] Streaming analysis failed',
      {
        requestId: request.requestId,
        error: message,
        elapsedMs: Math.round(elapsed),
      },
    );

    return {
      status: 'error',
      requestId: request.requestId,
      error: message,
      details: error instanceof Error ? error.stack : undefined,
      metrics: {
        bytesFetched: 0,
        requests: 0,
        elapsedMs: Math.round(elapsed),
      },
    };
  }
}

// Register streaming listeners
registerStreamingListeners();

// Listen for responses from sandbox
window.addEventListener('message', (event) => {
  if (!isFromSandbox(event)) return;

  if (isSandboxMessage(event, 'result')) {
    const { requestId, data } = event.data;
    const pending = pendingRequests.get(requestId);

    if (pending) {
      logMediaDebug(pending.debug, 'stream-analysis-result', {
        requestId,
      });
      clearTimeout(pending.timeout);
      pendingRequests.delete(requestId);
      pending.resolve(data);
    }
  }
});

export function destroySandbox(): void {
  cleanupStreamingListeners();
  destroySandboxLifecycle(pendingRequests);
}
