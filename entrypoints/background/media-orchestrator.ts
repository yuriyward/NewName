/**
 * Media analysis orchestration and upgrade proposal generation
 */
import {
  type UpgradeProposal,
  updateHistoryItem,
} from '@/entrypoints/shared/history/history';
import type { MediaDebugSettings } from '@/entrypoints/shared/integrations/mediainfo/debug';
import { logMediaDebug } from '@/entrypoints/shared/integrations/mediainfo/debug';
import type { MediaAnalysisResponse } from '@/entrypoints/shared/integrations/mediainfo/messages';
import { generateMediaEnhancedFilename } from '@/entrypoints/shared/naming/policy-engine';
import type { Settings } from '@/entrypoints/shared/settings/settings';

/**
 * Apply media analysis response to history item and generate upgrade proposal if applicable.
 */
export async function applyMediaAnalysisResponse(
  historyId: string,
  url: string,
  requestId: string,
  debug: MediaDebugSettings | undefined,
  response: MediaAnalysisResponse,
  downloadId: string | undefined,
  readSettings: () => Settings,
): Promise<void> {
  const analyzedAt = Date.now();

  try {
    const analysisMetrics = {
      historyId,
      requestId,
      status: response.status,
      bytesFetched: response.metrics.bytesFetched,
      requests: response.metrics.requests,
      elapsedMs: response.metrics.elapsedMs,
      fileSize:
        response.status === 'success' ? response.metrics.fileSize : undefined,
    };
    logMediaDebug(debug, 'analysis-metrics', analysisMetrics);
    console.log('[NewName] analysis-metrics', analysisMetrics);

    const updated = await updateHistoryItem(historyId, (item) => {
      const media =
        response.status === 'success'
          ? {
              status: 'success' as const,
              analyzedAt,
              requestId,
              url,
              downloadId,
              summary: response.summary,
              metrics: response.metrics,
            }
          : {
              status: 'error' as const,
              analyzedAt,
              requestId,
              url,
              downloadId,
              metrics: response.metrics,
              error: response.error,
              details: response.details,
            };

      // Generate upgrade proposal if media analysis succeeded
      let upgrade: UpgradeProposal | undefined;
      if (
        response.status === 'success' &&
        (item.fileType === 'audio' || item.fileType === 'video')
      ) {
        const settings = readSettings();
        const enhanced = generateMediaEnhancedFilename(
          item.final,
          response.summary,
          item.fileType,
          {
            maxLength: settings.maxLen,
            separator: settings.separator,
            transliterateAscii: settings.transliterateAscii,
          },
        );

        // Only propose upgrade if the enhanced name is meaningfully different
        if (enhanced.filename !== item.final) {
          const pathDir = item.path.slice(0, item.path.lastIndexOf('/') + 1);
          upgrade = {
            proposedFilename: enhanced.filename,
            proposedPath: pathDir + enhanced.filename,
            confidence: 'suggested',
            reasonTags: ['media-specs', 'contextual-upgrade'],
            generatedAt: analyzedAt,
          };

          logMediaDebug(debug, 'upgrade-proposed', {
            historyId,
            requestId,
            currentName: item.final,
            proposedName: enhanced.filename,
          });
        }
      }

      return {
        ...item,
        media,
        upgrade,
      };
    });

    if (!updated) {
      logMediaDebug(debug, 'history-missing', {
        historyId,
        requestId,
      });
    }
  } catch (error) {
    logMediaDebug(debug, 'history-update-failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Convert settings to media debug settings if debug is enabled.
 */
export function toMediaDebugSettings(
  settings: Settings,
): MediaDebugSettings | undefined {
  if (!settings.debug.enabled) {
    return undefined;
  }
  return {
    enabled: true,
    level: settings.debug.level,
  };
}
