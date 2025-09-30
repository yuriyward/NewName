/**
 * Bridge for communicating with the sandboxed iframe that runs MediaInfo.js.
 * Handles iframe lifecycle, message passing, and request/response matching.
 */

import { browser } from 'wxt/browser';
import type {
  MediaAnalysisRequest,
  MediaAnalysisResponse,
} from '@/entrypoints/shared/integrations/mediainfo/messages';

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
 * Fetches media from URL and analyzes it via sandbox.
 * Fetch happens in offscreen context (has proper origin), then ArrayBuffer
 * is transferred to sandbox for analysis (has unsafe-eval for Embind).
 */
export async function fetchAndAnalyzeFromUrl(
  request: MediaAnalysisRequest,
): Promise<MediaAnalysisResponse> {
  if (!iframe) {
    throw new Error('Sandbox not initialized');
  }

  const start = performance.now();
  console.log('[SandboxBridge] Fetching media from URL', {
    requestId: request.requestId,
    url: request.url,
  });

  try {
    // Fetch in offscreen context (has proper extension origin, no CORS issues)
    const response = await fetch(request.url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch media: ${response.status} ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const fetchElapsed = performance.now() - start;
    const fileSize = arrayBuffer.byteLength;

    console.log('[SandboxBridge] Media fetched, transferring to sandbox', {
      requestId: request.requestId,
      fileSize,
      fetchElapsedMs: Math.round(fetchElapsed),
    });

    // Transfer ArrayBuffer to sandbox (zero-copy with transferables)
    const analysisStart = performance.now();
    const analysisResponse = await new Promise<MediaAnalysisResponse>(
      (resolve, reject) => {
        const timeout = setTimeout(() => {
          pendingRequests.delete(request.requestId);
          reject(
            new Error(
              `Sandbox analysis timeout after ${ANALYSIS_TIMEOUT_MS}ms for request ${request.requestId}`,
            ),
          );
        }, ANALYSIS_TIMEOUT_MS);

        pendingRequests.set(request.requestId, { resolve, reject, timeout });

        iframe?.contentWindow?.postMessage(
          {
            type: 'analyze-blob',
            requestId: request.requestId,
            data: {
              requestId: request.requestId,
              arrayBuffer,
              chunkSize: request.chunkSize,
              historyId: request.historyId,
              downloadId: request.downloadId,
            },
          },
          '*',
          [arrayBuffer], // Transfer ownership for zero-copy
        );
      },
    );

    const totalElapsed = performance.now() - start;
    console.log('[SandboxBridge] Analysis complete', {
      requestId: request.requestId,
      totalElapsedMs: Math.round(totalElapsed),
      fetchElapsedMs: Math.round(fetchElapsed),
      analysisElapsedMs: Math.round(performance.now() - analysisStart),
    });

    return analysisResponse;
  } catch (error) {
    const elapsed = performance.now() - start;
    const message =
      error instanceof Error ? error.message : 'Fetch/analysis failed';
    console.error('[SandboxBridge] Fetch/analysis failed', {
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
