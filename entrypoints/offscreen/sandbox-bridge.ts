/**
 * Bridge for communicating with the sandboxed iframe that runs MediaInfo.js.
 * Handles iframe lifecycle, message passing, and request/response matching.
 */

import { browser } from 'wxt/browser';
import { MEDIAINFO_CHUNK_SIZE } from '@/entrypoints/shared/integrations/mediainfo';
import type {
  MediaAnalysisRequest,
  MediaAnalysisResponse,
} from '@/entrypoints/shared/integrations/mediainfo/messages';
import { RangeFetchReader } from '@/entrypoints/shared/integrations/mediainfo/range-reader';

interface PendingRequest {
  resolve: (response: MediaAnalysisResponse) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

const SANDBOX_READY_TIMEOUT_MS = 5000;
const ANALYSIS_TIMEOUT_MS = 30000;

let iframe: HTMLIFrameElement | null = null;
let readyPromise: Promise<void> | null = null;
const pendingRequests = new Map<string, PendingRequest>();
const activeReaders = new Map<string, RangeFetchReader>();

function resolveSandboxUrl(): string {
  if (browser.runtime?.getURL) {
    return browser.runtime.getURL('/sandbox.html');
  }
  const extensionRoot = browser.runtime.getURL('/');
  return new URL('/sandbox.html', extensionRoot).toString();
}

function createIframe(): HTMLIFrameElement {
  const frame = document.createElement('iframe');
  frame.src = resolveSandboxUrl();
  frame.style.display = 'none';
  frame.sandbox.add('allow-scripts');
  document.body.appendChild(frame);
  console.log('[SandboxBridge] Created iframe', { src: frame.src });
  return frame;
}

function waitForReady(): Promise<void> {
  if (readyPromise) return readyPromise;

  readyPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Sandbox ready timeout after 5s'));
    }, SANDBOX_READY_TIMEOUT_MS);

    const handler = (event: MessageEvent) => {
      if (event.data.type === 'ready') {
        console.log('[SandboxBridge] Received ready signal from sandbox');
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        cleanup();
        resolve();
      }
    };

    function cleanup() {
      window.removeEventListener('message', handler);
    }

    window.addEventListener('message', handler);
  });

  return readyPromise;
}

export async function ensureSandboxReady(): Promise<void> {
  if (!iframe) {
    console.log('[SandboxBridge] Creating sandboxed iframe');
    iframe = createIframe();
  }

  await waitForReady();

  // Send init message to pre-initialize MediaInfo
  console.log('[SandboxBridge] Sending init to sandbox');
  const initId = `init_${Date.now()}`;

  const initResult = await new Promise<{ success: boolean; error?: string }>(
    (resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Sandbox init timeout'));
      }, SANDBOX_READY_TIMEOUT_MS);

      const handler = (event: MessageEvent) => {
        if (
          event.data.type === 'init-complete' &&
          event.data.requestId === initId
        ) {
          clearTimeout(timeout);
          window.removeEventListener('message', handler);
          resolve({
            success: event.data.success,
            error: event.data.error,
          });
        }
      };

      window.addEventListener('message', handler);
      iframe?.contentWindow?.postMessage(
        { type: 'init', requestId: initId },
        '*',
      );
    },
  );

  if (!initResult.success) {
    throw new Error(`Sandbox initialization failed: ${initResult.error}`);
  }

  console.log('[SandboxBridge] Sandbox fully initialized');
}

/**
 * Fetches media from URL using streaming and analyzes it via sandbox.
 * Stream happens in offscreen context (proper origin for CORS),
 * sandbox coordinates chunk requests via MediaInfo's callback API.
 */
export async function fetchAndAnalyzeFromUrl(
  request: MediaAnalysisRequest,
): Promise<MediaAnalysisResponse> {
  // Ensure sandbox is ready before attempting analysis
  await ensureSandboxReady();

  const start = performance.now();
  console.log('[SandboxBridge] Starting streaming media analysis', {
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
          const reader = activeReaders.get(request.requestId);
          if (reader) {
            activeReaders.delete(request.requestId);
          }
          reject(
            new Error(
              `Sandbox analysis timeout after ${ANALYSIS_TIMEOUT_MS}ms for request ${request.requestId}`,
            ),
          );
        }, ANALYSIS_TIMEOUT_MS);

        pendingRequests.set(request.requestId, { resolve, reject, timeout });

        iframe?.contentWindow?.postMessage(
          {
            type: 'analyze-url-streaming',
            requestId: request.requestId,
            data: {
              requestId: request.requestId,
              url: request.url,
              chunkSize: request.chunkSize,
              historyId: request.historyId,
              downloadId: request.downloadId,
            },
          },
          '*',
        );
      },
    );

    // Cleanup reader after analysis
    const reader = activeReaders.get(request.requestId);
    if (reader) {
      activeReaders.delete(request.requestId);
    }

    const totalElapsed = performance.now() - start;
    console.log('[SandboxBridge] Streaming analysis complete', {
      requestId: request.requestId,
      totalElapsedMs: Math.round(totalElapsed),
      bytesFetched: analysisResponse.metrics?.bytesFetched,
      requests: analysisResponse.metrics?.requests,
    });

    return analysisResponse;
  } catch (error) {
    // Cleanup reader on error
    const reader = activeReaders.get(request.requestId);
    if (reader) {
      activeReaders.delete(request.requestId);
    }

    const elapsed = performance.now() - start;
    const message =
      error instanceof Error ? error.message : 'Streaming analysis failed';
    console.error('[SandboxBridge] Streaming analysis failed', {
      requestId: request.requestId,
      error: message,
      elapsedMs: Math.round(elapsed),
    });

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

// Handle streaming fetch requests from sandbox
console.log('[SandboxBridge] Registering streaming message listeners');
window.addEventListener('message', (event) => {
  console.log('[SandboxBridge] Received message in offscreen', {
    type: event.data?.type,
    hasIframe: !!iframe,
    sourceMatchesIframe: event.source === iframe?.contentWindow,
    iframeContentWindow: !!iframe?.contentWindow,
  });

  // Only process messages from our sandbox iframe
  if (event.source !== iframe?.contentWindow) {
    console.log('[SandboxBridge] Ignoring message - not from sandbox iframe');
    return;
  }

  if (event.data.type === 'init-stream') {
    const { requestId, url } = event.data;
    console.log('[SandboxBridge] Initializing range reader', {
      requestId,
      url,
    });
    void (async () => {
      try {
        const reader = new RangeFetchReader(url, {
          chunkSize: MEDIAINFO_CHUNK_SIZE,
        });

        // Ensure size is known (makes HEAD request or initial range probe)
        await reader.ensureSize();
        activeReaders.set(requestId, reader);

        console.log('[SandboxBridge] Range reader initialized', {
          requestId,
          totalSize: reader.totalSize,
        });
        iframe?.contentWindow?.postMessage(
          {
            type: 'stream-ready',
            requestId,
            data: {
              success: true,
              totalSize: reader.totalSize,
            },
          },
          '*',
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Range reader init failed';
        console.error('[SandboxBridge] Range reader init failed', {
          requestId,
          error: message,
        });
        iframe?.contentWindow?.postMessage(
          {
            type: 'stream-error',
            requestId,
            data: { error: message },
          },
          '*',
        );
      }
    })();
    return;
  }

  if (event.data.type === 'fetch-chunk') {
    const { requestId, baseRequestId, offset, size } = event.data;
    console.log('[SandboxBridge] Fetching chunk', { requestId, offset, size });
    void (async () => {
      try {
        const reader = activeReaders.get(baseRequestId);
        if (!reader) {
          throw new Error('Range reader not found');
        }

        const bytes = await reader.read(size, offset);
        console.log('[SandboxBridge] Sending chunk', {
          requestId,
          bytesLength: bytes.length,
          bytesFetched: reader.bytesFetched,
          requests: reader.requests,
        });

        iframe?.contentWindow?.postMessage(
          {
            type: 'chunk-result',
            requestId,
            data: { bytes, offset, size: bytes.length },
          },
          '*',
          [bytes.buffer], // Transfer for zero-copy
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Chunk fetch failed';
        console.error('[SandboxBridge] Chunk fetch failed', {
          requestId,
          error: message,
        });
        iframe?.contentWindow?.postMessage(
          {
            type: 'chunk-error',
            requestId,
            data: { error: message },
          },
          '*',
        );
      }
    })();
    return;
  }

  if (event.data.type === 'cleanup-stream') {
    const { requestId } = event.data;
    console.log('[SandboxBridge] Cleaning up range reader', { requestId });
    const reader = activeReaders.get(requestId);
    if (reader) {
      console.log('[SandboxBridge] Range reader stats', {
        requestId,
        bytesFetched: reader.bytesFetched,
        requests: reader.requests,
        totalSize: reader.totalSize,
      });
      activeReaders.delete(requestId);
    }
    return;
  }

  // Deprecated Range-based handlers (kept for backwards compatibility)
  if (event.data.type === 'fetch-head') {
    const { requestId, url } = event.data;
    console.log('[SandboxBridge] Processing HEAD request', { requestId, url });
    void (async () => {
      try {
        // Try HEAD request first
        const headResponse = await fetch(url, {
          method: 'HEAD',
          cache: 'no-store',
          mode: 'cors',
        });

        if (headResponse.ok) {
          const contentLength = headResponse.headers.get('content-length');
          if (contentLength) {
            const size = Number.parseInt(contentLength, 10);
            if (Number.isFinite(size) && size > 0) {
              console.log(
                '[SandboxBridge] Sending HEAD result from Content-Length',
                { requestId, size },
              );
              iframe?.contentWindow?.postMessage(
                {
                  type: 'head-result',
                  requestId,
                  data: { size },
                },
                '*',
              );
              return;
            }
          }
        }

        // HEAD failed or no Content-Length - try initial Range request to get Content-Range
        console.log(
          '[SandboxBridge] HEAD returned no size, trying Range probe',
          { requestId },
        );
        const rangeResponse = await fetch(url, {
          headers: { Range: 'bytes=0-0' },
          cache: 'no-store',
          mode: 'cors',
        });

        console.log('[SandboxBridge] Range probe response received', {
          requestId,
          status: rangeResponse.status,
          ok: rangeResponse.ok,
          headers: {
            contentRange: rangeResponse.headers.get('content-range'),
            contentLength: rangeResponse.headers.get('content-length'),
            acceptRanges: rangeResponse.headers.get('accept-ranges'),
          },
        });

        if (rangeResponse.status === 206 || rangeResponse.ok) {
          const contentRange = rangeResponse.headers.get('content-range');
          if (contentRange) {
            // Parse "bytes 0-0/16528270" to get total size
            const match = contentRange.match(/bytes\s+\d+-\d+\/(\d+)/i);
            if (match?.[1]) {
              const size = Number.parseInt(match[1], 10);
              if (Number.isFinite(size) && size > 0) {
                console.log(
                  '[SandboxBridge] Sending HEAD result from Content-Range',
                  { requestId, size },
                );
                iframe?.contentWindow?.postMessage(
                  {
                    type: 'head-result',
                    requestId,
                    data: { size },
                  },
                  '*',
                );
                return;
              }
            }
          }

          // If no Content-Range, try Content-Length from Range response
          const contentLength = rangeResponse.headers.get('content-length');
          if (contentLength) {
            const responseSize = Number.parseInt(contentLength, 10);
            if (Number.isFinite(responseSize) && responseSize > 0) {
              // If server returned more than 1 byte for bytes=0-0, it doesn't support ranges
              // Use the full response body size as an approximation
              console.log(
                '[SandboxBridge] Server may not support ranges, using response size',
                { requestId, size: responseSize },
              );
              iframe?.contentWindow?.postMessage(
                {
                  type: 'head-result',
                  requestId,
                  data: { size: responseSize },
                },
                '*',
              );
              return;
            }
          }
        }

        // All methods failed - send error
        throw new Error(
          'Cannot determine file size (no Content-Length or Content-Range)',
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'HEAD request failed';
        console.error('[SandboxBridge] HEAD request failed', {
          requestId,
          error: message,
        });
        iframe?.contentWindow?.postMessage(
          {
            type: 'head-error',
            requestId,
            data: { error: message },
          },
          '*',
        );
      }
    })();
  }

  if (event.data.type === 'fetch-range') {
    const { requestId, url, offset, size } = event.data;
    console.log('[SandboxBridge] Processing Range request', {
      requestId,
      offset,
      size,
    });
    void (async () => {
      try {
        // Safety check: don't send invalid ranges
        if (size <= 0) {
          console.warn(
            '[SandboxBridge] Ignoring invalid Range request with size <= 0',
            { requestId, size },
          );
          iframe?.contentWindow?.postMessage(
            {
              type: 'range-result',
              requestId,
              data: { bytes: new Uint8Array(0), offset, size: 0 },
            },
            '*',
          );
          return;
        }

        const end = offset + size - 1;
        const response = await fetch(url, {
          headers: { Range: `bytes=${offset}-${end}` },
          cache: 'no-store',
          mode: 'cors',
        });

        if (!response.ok && response.status !== 206) {
          throw new Error(
            `Range request failed with status ${response.status}`,
          );
        }

        const bytes = new Uint8Array(await response.arrayBuffer());
        console.log('[SandboxBridge] Sending Range result', {
          requestId,
          bytesLength: bytes.length,
        });
        iframe?.contentWindow?.postMessage(
          {
            type: 'range-result',
            requestId,
            data: { bytes, offset, size: bytes.length },
          },
          '*',
          [bytes.buffer], // Transfer for zero-copy
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Range fetch failed';
        console.error('[SandboxBridge] Range request failed', {
          requestId,
          error: message,
        });
        iframe?.contentWindow?.postMessage(
          {
            type: 'range-error',
            requestId,
            data: { error: message },
          },
          '*',
        );
      }
    })();
  }
});

// Listen for responses from sandbox
window.addEventListener('message', (event) => {
  if (event.data.type === 'result') {
    const { requestId, data } = event.data;
    const pending = pendingRequests.get(requestId);

    if (pending) {
      console.log('[SandboxBridge] Received result from sandbox', {
        requestId,
      });
      clearTimeout(pending.timeout);
      pendingRequests.delete(requestId);
      pending.resolve(data);
    }
  }
});

export function destroySandbox(): void {
  if (iframe) {
    console.log('[SandboxBridge] Destroying sandbox iframe');
    iframe.remove();
    iframe = null;
    readyPromise = null;

    // Reject all pending requests
    for (const [_requestId, pending] of pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Sandbox destroyed'));
    }
    pendingRequests.clear();
  }
}
