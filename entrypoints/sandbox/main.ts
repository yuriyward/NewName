/**
 * Sandboxed iframe for MediaInfo.js WASM execution.
 * Runs in a sandbox context with unsafe-eval allowed for Emscripten glue code.
 */

import { analyzeMediaFromBlob } from '@/entrypoints/shared/integrations/mediainfo';
import { getMediaInfoInstance } from '@/entrypoints/shared/integrations/mediainfo/mediainfo-loader';
import type { MediaAnalysisResponse } from '@/entrypoints/shared/integrations/mediainfo/messages';

console.log('[Sandbox] MediaInfo sandbox script starting', {
  timestamp: Date.now(),
});

// Pre-initialize MediaInfo to ensure WASM is ready
let initialized = false;
let initPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    console.log('[Sandbox] Initializing MediaInfo WASM...');
    const start = performance.now();
    try {
      await getMediaInfoInstance();
      initialized = true;
      console.log('[Sandbox] MediaInfo WASM initialized', {
        elapsedMs: Math.round(performance.now() - start),
      });
    } catch (error) {
      initPromise = null;
      console.error('[Sandbox] MediaInfo initialization failed:', error);
      throw error;
    }
  })();

  return initPromise;
}

// Handle messages from parent (offscreen document)
window.addEventListener('message', async (event) => {
  const { type, requestId, data } = event.data;

  if (type === 'ping') {
    // Health check / handshake
    console.log('[Sandbox] Received ping, sending pong');
    window.parent.postMessage(
      { type: 'pong', requestId, timestamp: Date.now() },
      '*',
    );
    return;
  }

  if (type === 'init') {
    // Initialize MediaInfo eagerly
    console.log('[Sandbox] Received init request');
    try {
      await ensureInitialized();
      window.parent.postMessage(
        { type: 'init-complete', requestId, success: true },
        '*',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Init failed';
      window.parent.postMessage(
        {
          type: 'init-complete',
          requestId,
          success: false,
          error: message,
        },
        '*',
      );
    }
    return;
  }

  if (type === 'analyze-blob') {
    // Analyze media from ArrayBuffer transferred from offscreen
    const { arrayBuffer, requestId: reqId } = data;
    const start = performance.now();

    console.log('[Sandbox] Received blob analysis request', {
      requestId: reqId,
      blobSize: arrayBuffer?.byteLength ?? 0,
    });

    try {
      if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) {
        throw new Error('Invalid ArrayBuffer received');
      }

      await ensureInitialized();

      // Convert ArrayBuffer to Blob for MediaInfo analysis
      const blob = new Blob([arrayBuffer]);
      const result = await analyzeMediaFromBlob(blob);
      const elapsed = performance.now() - start;

      console.log('[Sandbox] Blob analysis complete', {
        requestId: reqId,
        elapsedMs: Math.round(elapsed),
        blobSize: blob.size,
      });

      const response: MediaAnalysisResponse = {
        status: 'success',
        requestId: reqId,
        summary: result.summary,
        raw: result.raw,
        metrics: {
          fileSize: blob.size,
          bytesFetched: blob.size, // All bytes were fetched in offscreen
          requests: 1, // Single fetch in offscreen
          elapsedMs: Math.round(elapsed),
          chunkSize: blob.size, // Full file analyzed as single blob
        },
      };

      window.parent.postMessage(
        { type: 'result', requestId: reqId, data: response },
        '*',
      );
    } catch (error) {
      const elapsed = performance.now() - start;
      const baseMessage =
        error instanceof Error ? error.message : 'Media analysis failed';
      const details =
        error instanceof Error && error.stack ? error.stack : undefined;

      console.error('[Sandbox] Blob analysis failed', {
        requestId: reqId,
        error: baseMessage,
        elapsedMs: Math.round(elapsed),
      });

      const response: MediaAnalysisResponse = {
        status: 'error',
        requestId: reqId,
        error: baseMessage,
        details,
        metrics: {
          bytesFetched: 0,
          requests: 0,
          elapsedMs: Math.round(elapsed),
        },
      };

      window.parent.postMessage(
        { type: 'result', requestId: reqId, data: response },
        '*',
      );
    }
  }
});

// Signal readiness to parent
console.log('[Sandbox] Sending ready signal to parent');
window.parent.postMessage({ type: 'ready', timestamp: Date.now() }, '*');
