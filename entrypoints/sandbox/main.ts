/**
 * Sandboxed iframe for MediaInfo.js WASM execution.
 * Runs in a sandbox context with unsafe-eval allowed for Emscripten glue code.
 */

import type { ReadChunkFunc } from 'mediainfo.js';
import {
  analyzeMediaFromBlob,
  MEDIAINFO_CHUNK_SIZE,
} from '@/entrypoints/shared/integrations/mediainfo';
import { summariseMediaInfo } from '@/entrypoints/shared/integrations/mediainfo/media-summary';
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
    return;
  }

  if (type === 'analyze-url-streaming') {
    // Analyze media using streaming via parent offscreen
    const { url, requestId: reqId, chunkSize: customChunkSize } = data;
    const start = performance.now();
    const chunkSize = customChunkSize ?? MEDIAINFO_CHUNK_SIZE;

    console.log('[Sandbox] Received streaming analysis request', {
      requestId: reqId,
      url,
      chunkSize,
    });

    let totalBytesFetched = 0;
    let totalRequests = 0;
    let actualFileSize: number | undefined;

    try {
      await ensureInitialized();

      // Initialize stream in parent offscreen
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          window.removeEventListener('message', initListener);
          reject(new Error('Stream init timeout'));
        }, 10000);

        const initListener = (event: MessageEvent) => {
          if (event.data.requestId === reqId) {
            if (event.data.type === 'stream-ready') {
              clearTimeout(timeout);
              window.removeEventListener('message', initListener);
              // Capture the actual file size from offscreen
              actualFileSize = event.data.data?.totalSize;
              resolve();
            } else if (event.data.type === 'stream-error') {
              clearTimeout(timeout);
              window.removeEventListener('message', initListener);
              reject(new Error(event.data.data.error));
            }
          }
        };

        window.addEventListener('message', initListener);
        window.parent.postMessage(
          { type: 'init-stream', requestId: reqId, url },
          '*',
        );
      });

      console.log('[Sandbox] Stream initialized, starting analysis', {
        requestId: reqId,
        actualFileSize,
      });

      // Create ReadChunkFunc that reads from stream via parent offscreen
      const readChunk: ReadChunkFunc = async (size, offset) => {
        const chunkRequestId = `${reqId}_chunk_${offset}_${size}`;
        return new Promise<Uint8Array>((resolve, reject) => {
          const timeout = setTimeout(() => {
            window.removeEventListener('message', chunkListener);
            reject(new Error(`Chunk fetch timeout for offset ${offset}`));
          }, 10000);

          const chunkListener = (event: MessageEvent) => {
            if (event.data.requestId === chunkRequestId) {
              if (event.data.type === 'chunk-result') {
                clearTimeout(timeout);
                window.removeEventListener('message', chunkListener);
                const bytes = new Uint8Array(event.data.data.bytes);
                totalBytesFetched += bytes.length;
                totalRequests += 1;
                resolve(bytes);
              } else if (event.data.type === 'chunk-error') {
                clearTimeout(timeout);
                window.removeEventListener('message', chunkListener);
                reject(new Error(event.data.data.error));
              }
            }
          };

          window.addEventListener('message', chunkListener);
          window.parent.postMessage(
            {
              type: 'fetch-chunk',
              requestId: chunkRequestId,
              baseRequestId: reqId,
              offset,
              size,
            },
            '*',
          );
        });
      };

      // Analyze with MediaInfo using range-based chunked API
      // RangeFetchReader in offscreen fetches only the byte ranges MediaInfo needs
      // Server returns 206 Partial Content for each range request
      const mediaInfo = await getMediaInfoInstance();
      const raw = await mediaInfo.analyzeData(
        () => 10 * 1024 * 1024 * 1024,
        readChunk,
      );

      const summary = summariseMediaInfo(raw);
      const elapsed = performance.now() - start;

      // Cleanup stream
      window.parent.postMessage(
        { type: 'cleanup-stream', requestId: reqId },
        '*',
      );

      console.log('[Sandbox] Streaming analysis complete', {
        requestId: reqId,
        elapsedMs: Math.round(elapsed),
        bytesFetched: totalBytesFetched,
        actualFileSize,
        requests: totalRequests,
      });

      const response: MediaAnalysisResponse = {
        status: 'success',
        requestId: reqId,
        summary,
        raw,
        metrics: {
          fileSize: actualFileSize ?? totalBytesFetched,
          bytesFetched: totalBytesFetched,
          requests: totalRequests,
          elapsedMs: Math.round(elapsed),
          chunkSize,
        },
      };

      window.parent.postMessage(
        { type: 'result', requestId: reqId, data: response },
        '*',
      );
    } catch (error) {
      const elapsed = performance.now() - start;
      const baseMessage =
        error instanceof Error
          ? error.message
          : 'Streaming media analysis failed';
      const details =
        error instanceof Error && error.stack ? error.stack : undefined;

      console.error('[Sandbox] Streaming analysis failed', {
        requestId: reqId,
        error: baseMessage,
        elapsedMs: Math.round(elapsed),
      });

      // Cleanup stream on error
      window.parent.postMessage(
        { type: 'cleanup-stream', requestId: reqId },
        '*',
      );

      const response: MediaAnalysisResponse = {
        status: 'error',
        requestId: reqId,
        error: baseMessage,
        details,
        metrics: {
          bytesFetched: totalBytesFetched,
          requests: totalRequests,
          elapsedMs: Math.round(elapsed),
        },
      };

      window.parent.postMessage(
        { type: 'result', requestId: reqId, data: response },
        '*',
      );
    }
    return;
  }
});

// Signal readiness to parent
console.log('[Sandbox] Sending ready signal to parent');
window.parent.postMessage({ type: 'ready', timestamp: Date.now() }, '*');
