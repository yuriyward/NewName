import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { verifyDirectoryPermission } from '@/entrypoints/shared/filesystem/directory-picker';
import {
  readFileSlice,
  resolveFileHandle,
} from '@/entrypoints/shared/filesystem/file-reader';
import { getStoredDirectoryHandle } from '@/entrypoints/shared/filesystem/handle-storage';
import { AiRouter } from '@/entrypoints/shared/integrations/ai-provider/ai-router';
import { normalizeTextBuffer } from '@/entrypoints/shared/integrations/text-analysis/normalize';
import type {
  TextUpgradeAnalysisRequest,
  TextUpgradeAnalysisResponse,
  TextUpgradeAnalysisUnavailable,
  TextUpgradeIngestionResult,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import { onExtensionMessage } from '@/entrypoints/shared/messaging/extension-messaging';
import { getSettings } from '@/entrypoints/shared/settings/settings';

const DEFAULT_MAX_BYTES = 128 * 1024; // 128 KB

let registered = false;

export function initializeTextAnalysisHandler(): void {
  if (registered) return;
  registered = true;

  onExtensionMessage('requestTextIngestion', async ({ data }) => {
    const request = data as TextUpgradeAnalysisRequest;
    const startedAt = performance.now();

    try {
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

      const fileResult = await resolveFileHandle(
        rootHandle,
        request.relativePath,
        request.filename,
      );

      if (!fileResult.success) {
        return errorResult(request, fileResult.error);
      }

      const maxBytes = Math.max(
        16 * 1024,
        request.settings.maxBytes || DEFAULT_MAX_BYTES,
      );

      const readResult = await readFileSlice(fileResult.fileHandle, maxBytes);
      if (!readResult.success) {
        return errorResult(request, readResult.error);
      }

      if (readResult.fileSize === 0) {
        return {
          status: 'skipped',
          requestId: request.requestId,
          analyzedAt: Date.now(),
          reason: 'empty-content',
          message: 'File is empty',
        } satisfies TextUpgradeAnalysisResponse;
      }

      const buffer = readResult.buffer;

      const normalized = normalizeTextBuffer(buffer, {
        maxLength: Math.min(50_000, Math.max(10_000, maxBytes)),
      });
      const elapsedMs = Math.round(performance.now() - startedAt);

      const response: TextUpgradeIngestionResult = {
        status: 'ingested',
        requestId: request.requestId,
        analyzedAt: Date.now(),
        text: normalized.text,
        encoding: normalized.encoding,
        originalLength: normalized.originalLength,
        truncated: normalized.truncated || readResult.truncated,
        sizeBytes: readResult.fileSize,
        metrics: {
          readBytes: readResult.bytesRead,
          elapsedMs,
        },
      };

      if (debugLogger.isEnabled()) {
        debugLogger.log('[Offscreen][TextAnalysis] Ingestion complete', {
          requestId: request.requestId,
          path: request.relativePath || fileResult.filename,
          readBytes: readResult.bytesRead,
          fileSize: readResult.fileSize,
          truncated: response.truncated,
          elapsedMs,
        });
      }

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

      const aiResponse = await router.analyzeText(request, response);
      if (aiResponse) {
        return aiResponse;
      }

      return response satisfies TextUpgradeAnalysisResponse;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Text ingestion failed';
      debugLogger.error('[Offscreen][TextAnalysis] Ingestion failed', {
        requestId: (data as TextUpgradeAnalysisRequest).requestId,
        error,
      });
      return errorResult(data as TextUpgradeAnalysisRequest, message);
    }
  });
}

function unavailable(
  request: TextUpgradeAnalysisRequest,
  reason: TextUpgradeAnalysisUnavailable['reason'],
  message: string,
): TextUpgradeAnalysisResponse {
  return {
    status: 'unavailable',
    requestId: request.requestId,
    analyzedAt: Date.now(),
    reason,
    message,
  };
}

function errorResult(
  request: TextUpgradeAnalysisRequest,
  error: string,
): TextUpgradeAnalysisResponse {
  return {
    status: 'error',
    requestId: request.requestId,
    analyzedAt: Date.now(),
    error,
  };
}
