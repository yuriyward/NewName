/**
 * Offscreen image analysis request handler
 * Handles image file reading, preparation, and AI analysis pipeline
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { verifyDirectoryPermission } from '@/entrypoints/shared/filesystem/directory-picker';
import { resolveFileHandle } from '@/entrypoints/shared/filesystem/file-reader';
import { getStoredDirectoryHandle } from '@/entrypoints/shared/filesystem/handle-storage';
import { AiRouter } from '@/entrypoints/shared/integrations/ai-provider/ai-router';
import type {
  ImageUpgradeAnalysisRequest,
  ImageUpgradeAnalysisResponse,
  ImageUpgradeAnalysisUnavailable,
} from '@/entrypoints/shared/integrations/image-analysis/types';
import { onExtensionMessage } from '@/entrypoints/shared/messaging/extension-messaging';
import { getSettings } from '@/entrypoints/shared/settings/settings';
import { ingestImageForPrompt } from './image-analysis/image-ingestion';

let registered = false;

/**
 * Initialize the image analysis handler
 * Registers listener for image ingestion requests from background context
 */
export function initializeImageAnalysisHandler(): void {
  if (registered) return;
  registered = true;

  onExtensionMessage('requestImageIngestion', async ({ data }) => {
    const request = data as ImageUpgradeAnalysisRequest;
    const startedAt = performance.now();

    try {
      // Verify downloads directory handle exists and is accessible
      const rootHandle = await getStoredDirectoryHandle();
      if (!rootHandle) {
        return unavailable(
          request,
          'permissions-denied',
          'No Downloads directory handle stored',
        );
      }

      const permission = await verifyDirectoryPermission(rootHandle);
      if (permission !== 'granted') {
        return unavailable(
          request,
          'permissions-denied',
          'Downloads directory permission not granted',
        );
      }

      // Resolve file handle from path
      const fileResult = await resolveFileHandle(
        rootHandle,
        request.relativePath,
        request.filename,
      );

      if (!fileResult.success) {
        return errorResult(request, fileResult.error);
      }

      // Ingest image: read file, create ImageBitmap, downscale, encode PNG
      const ingestionResult = await ingestImageForPrompt(fileResult.fileHandle);
      if (!ingestionResult.success) {
        return errorResult(request, ingestionResult.error);
      }

      const elapsedMs = Math.round(performance.now() - startedAt);

      if (debugLogger.isEnabled()) {
        debugLogger.log('[Offscreen][ImageAnalysis] Ingestion complete', {
          requestId: request.requestId,
          path: request.relativePath || fileResult.filename,
          originalSize: `${ingestionResult.originalWidth}x${ingestionResult.originalHeight}`,
          resizedSize: `${ingestionResult.resizedWidth}x${ingestionResult.resizedHeight}`,
          resizeRatio: ingestionResult.resizeRatio.toFixed(2),
          blobSize: ingestionResult.blob.size,
          elapsedMs,
        });
      }

      // Create ingestion result for pipeline
      const ingestionPayload = {
        status: 'ingested' as const,
        requestId: request.requestId,
        analyzedAt: Date.now(),
        blob: ingestionResult.blob,
        mimeType: ingestionResult.mimeType,
        originalWidth: ingestionResult.originalWidth,
        originalHeight: ingestionResult.originalHeight,
        resizedWidth: ingestionResult.resizedWidth,
        resizedHeight: ingestionResult.resizedHeight,
        resizeRatio: ingestionResult.resizeRatio,
        originalSizeBytes: ingestionResult.originalSizeBytes,
        metrics: {
          readBytes: ingestionResult.originalSizeBytes,
          elapsedMs: ingestionResult.elapsedMs,
        },
      };

      // Get settings to configure AI router
      const settings = await getSettings();
      const router = new AiRouter({
        cloudConfig: {
          enabled: settings.cloud.enabled,
          apiKey: settings.cloud.apiKey,
          model: settings.cloud.model,
          consentGiven: settings.cloud.consentGiven,
          consentTimestamp: settings.cloud.consentTimestamp,
        },
        preferences: settings.processingPreferences,
      });

      // Run AI upgrade pipeline via router
      const aiResponse = await router.analyzeImage(request, ingestionPayload);
      if (aiResponse) {
        return aiResponse;
      }

      // Return ingestion result without AI analysis
      return ingestionPayload;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Image ingestion failed';
      debugLogger.error('[Offscreen][ImageAnalysis] Ingestion failed', {
        requestId: (data as ImageUpgradeAnalysisRequest).requestId,
        error,
      });
      return errorResult(data as ImageUpgradeAnalysisRequest, message);
    }
  });
}

function unavailable(
  request: ImageUpgradeAnalysisRequest,
  reason: ImageUpgradeAnalysisUnavailable['reason'],
  message: string,
): ImageUpgradeAnalysisResponse {
  return {
    status: 'unavailable',
    requestId: request.requestId,
    analyzedAt: Date.now(),
    reason,
    message,
  };
}

function errorResult(
  request: ImageUpgradeAnalysisRequest,
  error: string,
): ImageUpgradeAnalysisResponse {
  return {
    status: 'error',
    requestId: request.requestId,
    analyzedAt: Date.now(),
    error,
  };
}
