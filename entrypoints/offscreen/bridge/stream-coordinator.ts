/**
 * Streaming coordinator for range-based media fetching
 */
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { MEDIAINFO_CHUNK_SIZE } from '@/entrypoints/shared/integrations/mediainfo';
import { RangeFetchReader } from '@/entrypoints/shared/integrations/range-fetcher';
import { getSandboxWindow, isFromSandbox } from './sandbox-lifecycle';
import {
  isSandboxMessage,
  postToSandboxWithTransfer,
  type SandboxToParentMessages,
} from './sandbox-protocol';

const activeReaders = new Map<string, RangeFetchReader>();

/**
 * Register streaming message listeners for range-based fetching.
 */
export function registerStreamingListeners(): void {
  console.log('[SandboxBridge] Registering streaming message listeners');
  window.addEventListener('message', handleStreamingMessage);
}

/**
 * Cleanup streaming message listeners to prevent memory leaks.
 */
export function cleanupStreamingListeners(): void {
  console.log('[SandboxBridge] Cleaning up streaming message listeners');
  window.removeEventListener('message', handleStreamingMessage);
  activeReaders.clear();
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

  if (isSandboxMessage(event, 'init-stream')) {
    handleInitStream(event.data);
    return;
  }

  if (isSandboxMessage(event, 'fetch-chunk')) {
    handleFetchChunk(event.data);
    return;
  }

  if (isSandboxMessage(event, 'cleanup-stream')) {
    handleCleanupStream(event.data);
    return;
  }
}

/**
 * Initialize a range reader for streaming.
 */
function handleInitStream(data: SandboxToParentMessages['init-stream']): void {
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
      postToSandboxWithTransfer(getSandboxWindow(), 'stream-ready', {
        requestId,
        data: {
          success: true,
          totalSize: reader.totalSize,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Range reader init failed';
      debugLogger.error('[SandboxBridge] Range reader init failed', {
        requestId,
        error: message,
      });
      postToSandboxWithTransfer(getSandboxWindow(), 'stream-error', {
        requestId,
        data: { error: message },
      });
    }
  })();
}

/**
 * Fetch a chunk from the range reader.
 */
function handleFetchChunk(data: SandboxToParentMessages['fetch-chunk']): void {
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

      postToSandboxWithTransfer(
        getSandboxWindow(),
        'chunk-result',
        {
          requestId,
          data: { bytes, offset, size: bytes.length },
        },
        [bytes.buffer], // Transfer for zero-copy
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Chunk fetch failed';
      debugLogger.error('[SandboxBridge] Chunk fetch failed', {
        requestId,
        error: message,
      });
      postToSandboxWithTransfer(getSandboxWindow(), 'chunk-error', {
        requestId,
        data: { error: message },
      });
    }
  })();
}

/**
 * Cleanup a range reader after analysis completes.
 */
function handleCleanupStream(
  data: SandboxToParentMessages['cleanup-stream'],
): void {
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
