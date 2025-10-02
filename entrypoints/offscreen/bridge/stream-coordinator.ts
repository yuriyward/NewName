/**
 * Streaming coordinator for range-based media fetching
 */
import { MEDIAINFO_CHUNK_SIZE } from '@/entrypoints/shared/integrations/mediainfo';
import { RangeFetchReader } from '@/entrypoints/shared/integrations/mediainfo/range-reader';
import { getSandboxWindow, isFromSandbox } from './sandbox-lifecycle';

const activeReaders = new Map<string, RangeFetchReader>();

/**
 * Register streaming message listeners for range-based fetching.
 */
export function registerStreamingListeners(): void {
  console.log('[SandboxBridge] Registering streaming message listeners');
  window.addEventListener('message', handleStreamingMessage);
}

/**
 * Handle streaming-related messages from sandbox.
 */
function handleStreamingMessage(event: MessageEvent): void {
  console.log('[SandboxBridge] Received message in offscreen', {
    type: event.data?.type,
    sourceMatchesIframe: isFromSandbox(event),
  });

  // Only process messages from our sandbox iframe
  if (!isFromSandbox(event)) {
    console.log('[SandboxBridge] Ignoring message - not from sandbox iframe');
    return;
  }

  if (event.data.type === 'init-stream') {
    handleInitStream(event.data);
    return;
  }

  if (event.data.type === 'fetch-chunk') {
    handleFetchChunk(event.data);
    return;
  }

  if (event.data.type === 'cleanup-stream') {
    handleCleanupStream(event.data);
    return;
  }
}

/**
 * Initialize a range reader for streaming.
 */
function handleInitStream(data: { requestId: string; url: string }): void {
  const { requestId, url } = data;
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
      getSandboxWindow()?.postMessage(
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
      getSandboxWindow()?.postMessage(
        {
          type: 'stream-error',
          requestId,
          data: { error: message },
        },
        '*',
      );
    }
  })();
}

/**
 * Fetch a chunk from the range reader.
 */
function handleFetchChunk(data: {
  requestId: string;
  baseRequestId: string;
  offset: number;
  size: number;
}): void {
  const { requestId, baseRequestId, offset, size } = data;
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

      getSandboxWindow()?.postMessage(
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
      getSandboxWindow()?.postMessage(
        {
          type: 'chunk-error',
          requestId,
          data: { error: message },
        },
        '*',
      );
    }
  })();
}

/**
 * Cleanup a range reader after analysis completes.
 */
function handleCleanupStream(data: { requestId: string }): void {
  const { requestId } = data;
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
}

/**
 * Cleanup a specific reader by request ID.
 */
export function cleanupReader(requestId: string): void {
  const reader = activeReaders.get(requestId);
  if (reader) {
    activeReaders.delete(requestId);
  }
}
