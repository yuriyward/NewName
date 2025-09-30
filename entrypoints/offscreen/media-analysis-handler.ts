import { MEDIAINFO_CHUNK_SIZE } from '@/entrypoints/shared/integrations/mediainfo';
import { logMediaDebug } from '@/entrypoints/shared/integrations/mediainfo/debug';
import type {
  MediaAnalysisRequest,
  MediaAnalysisResponse,
} from '@/entrypoints/shared/integrations/mediainfo/messages';
import { onExtensionMessage } from '@/entrypoints/shared/messaging/extension-messaging';
import { ensureSandboxReady, fetchAndAnalyzeFromUrl } from './sandbox-bridge';

let registered = false;

export function initializeMediaAnalysisHandler(): void {
  if (registered) return;
  registered = true;

  onExtensionMessage('requestMediaAnalysis', async ({ data }) => {
    const request = data as MediaAnalysisRequest;
    const start = performance.now();
    const chunkSize = request.chunkSize ?? MEDIAINFO_CHUNK_SIZE;

    logMediaDebug(request.debug, 'analysis-request-received', {
      requestId: request.requestId,
      historyId: request.historyId,
      downloadId: request.downloadId,
      url: request.url,
      chunkSize,
    });

    try {
      // Use sandbox bridge: fetch in offscreen, analyze in sandbox
      logMediaDebug(request.debug, 'analysis-start-sandbox', {
        requestId: request.requestId,
        url: request.url,
        chunkSize,
      });

      const response = await fetchAndAnalyzeFromUrl(request);

      logMediaDebug(request.debug, 'analysis-complete', {
        requestId: request.requestId,
        status: response.status,
        elapsedMs: response.metrics?.elapsedMs,
        bytesFetched: response.metrics?.bytesFetched,
        fileSize:
          response.status === 'success'
            ? response.metrics?.fileSize
            : undefined,
        summary: response.status === 'success' ? response.summary : undefined,
      });

      return response;
    } catch (error) {
      const elapsed = performance.now() - start;
      const baseMessage =
        error instanceof Error ? error.message : 'Media analysis failed';
      const details =
        error instanceof Error && error.stack ? error.stack : undefined;

      logMediaDebug(request.debug, 'analysis-error', {
        requestId: request.requestId,
        elapsedMs: Math.round(elapsed),
        error: baseMessage,
      });

      const response: MediaAnalysisResponse = {
        status: 'error',
        requestId: request.requestId,
        error: baseMessage,
        details,
        metrics: {
          bytesFetched: 0,
          requests: 0,
          elapsedMs: Math.round(elapsed),
        },
      };
      return response;
    }
  });

  // Acknowledge offscreen readiness (used by background to gate handshake)
  onExtensionMessage('offscreenReady', () => {
    logMediaDebug({ enabled: true, level: 'detailed' }, 'offscreen-ready-ack');
    return { ok: true as const };
  });

  // Handshake endpoint to ensure sandbox is ready
  onExtensionMessage('offscreenHandshake', async ({ sender }) => {
    const start = performance.now();
    try {
      logMediaDebug(
        { enabled: true, level: 'detailed' },
        'offscreen-handshake-start',
        {
          timestamp: Date.now(),
          senderUrl: sender?.url ?? null,
          frameId: sender?.frameId,
        },
      );

      // Initialize sandbox with MediaInfo WASM
      await ensureSandboxReady();
      const elapsed = Math.round(performance.now() - start);

      logMediaDebug(
        { enabled: true, level: 'detailed' },
        'offscreen-handshake-ready',
        {
          elapsedMs: elapsed,
          sandboxReady: true,
        },
      );

      return { ready: true as const };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Handshake failed';
      const elapsed = Math.round(performance.now() - start);

      logMediaDebug(
        { enabled: true, level: 'detailed' },
        'offscreen-handshake-error',
        {
          error: message,
          elapsedMs: elapsed,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: Date.now(),
        },
      );
      throw new Error(`Sandbox handshake failed: ${message}`);
    }
  });
}
