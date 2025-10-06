/**
 * Download coordination logic for onDeterminingFilename events
 */
import type { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { DebugContext } from '@/entrypoints/shared/debug/types';
import { addHistoryItem } from '@/entrypoints/shared/history/history';
import { logMediaDebug } from '@/entrypoints/shared/integrations/mediainfo/debug';
import { enqueueMediaAnalysis } from '@/entrypoints/shared/integrations/mediainfo/media-analysis-queue';
import type { MediaAnalysisRequest } from '@/entrypoints/shared/integrations/mediainfo/messages';
import {
  evaluateInstantBaseline,
  evaluateInstantBaselineDebug,
  type InstantBaselineComputation,
} from '@/entrypoints/shared/pipeline/instant-baseline-strategy';
import type { InstantBaselineEvaluation } from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type {
  FileType,
  Settings,
} from '@/entrypoints/shared/settings/settings';
import type { PageContextService } from '@/entrypoints/shared/state/page-context-service';
import {
  basename,
  fallbackNameFromUrl,
} from '@/entrypoints/shared/utils/filename';
import { randomId } from '@/entrypoints/shared/utils/id';
import {
  type DownloadTrackingEntry,
  recordDownloadTracking,
} from './download-tracking';
import {
  applyMediaAnalysisResponse,
  toMediaDebugSettings,
} from './media-orchestrator';
import { createSuggestController } from './suggest-controller';

export type DeterminingListener = Parameters<
  typeof browser.downloads.onDeterminingFilename.addListener
>[0];

export type DeterminingItem = Parameters<DeterminingListener>[0];
export type SuggestCallback = Parameters<DeterminingListener>[1];
export type SuggestPayload = Parameters<SuggestCallback>[0];

/**
 * Check if the file type is a media file (audio or video).
 */
export function isMediaFileType(
  fileType: FileType,
): fileType is Extract<FileType, 'audio' | 'video'> {
  return fileType === 'audio' || fileType === 'video';
}

/**
 * Check if renaming is enabled for the given file type.
 */
export function shouldRenameType(
  settings: Settings,
  fileType: keyof Settings['perType'],
): boolean {
  const behavior = settings.perType[fileType]?.behavior ?? 'auto';
  if (behavior === 'off') return false;
  return true;
}

type DownloadItemNumeric = Partial<Record<'id' | 'tabId', number>>;

function getNumericProperty(
  target: DownloadItemNumeric,
  key: keyof DownloadItemNumeric,
): number | undefined {
  const value = target[key];
  return typeof value === 'number' ? value : undefined;
}

/**
 * Process the determining filename event and suggest a renamed filename if applicable.
 */
export async function processDeterminingFilename(
  item: DeterminingItem,
  suggest: SuggestCallback,
  pageContextService: PageContextService,
  readSettings: () => Settings,
  downloadTracking: Map<number, DownloadTrackingEntry>,
): Promise<void> {
  const controller = createSuggestController(suggest);
  let suggestionIssued = false;
  try {
    await pageContextService.prune();

    const settings = readSettings();
    const url = item.finalUrl ?? item.url;
    const filename = item.filename ?? fallbackNameFromUrl(url);
    const rawDownloadId = getNumericProperty(item, 'id');
    const downloadId =
      rawDownloadId !== undefined ? String(rawDownloadId) : undefined;
    const initiatingTabId = getNumericProperty(item, 'tabId');
    const pageContext = await pageContextService.read({
      tabId: initiatingTabId,
      url: item.referrer,
    });

    const signals = {
      url,
      referrer: item.referrer,
      filename,
      mime: item.mime,
      startTime: item.startTime,
      page: pageContext,
    };

    let computation: InstantBaselineComputation;
    let debugContext: DebugContext | null = null;

    if (debugLogger.isEnabled()) {
      const downloadId = debugLogger.createDownloadId();
      debugContext = evaluateInstantBaselineDebug(
        signals,
        settings,
        downloadId,
      );
      debugLogger.startContext(downloadId, debugContext);
      computation = {
        evaluation: debugContext.evaluation,
        inputs: debugContext.strategy.inputs,
      };
    } else {
      computation = evaluateInstantBaseline(signals, settings);
    }

    const evaluation: InstantBaselineEvaluation = computation.evaluation;
    const typeEnabled = shouldRenameType(settings, evaluation.fileType);
    const renameCandidate = typeEnabled ? evaluation.rename : undefined;

    const historyId = randomId();

    if (renameCandidate) {
      const submitted = controller.trySuggest({
        filename: renameCandidate.path,
      });
      if (!submitted) {
        return;
      }
      suggestionIssued = true;
    } else {
      const submitted = controller.trySuggest();
      if (!submitted) {
        return;
      }
      suggestionIssued = true;
      return;
    }

    const historyDecision: InstantBaselineEvaluation['decision'] =
      renameCandidate
        ? evaluation.decision
        : {
            ...evaluation.decision,
            outcome: 'keep',
            reasons:
              evaluation.decision.outcome === 'rename' && !typeEnabled
                ? [...evaluation.decision.reasons, 'file-type-disabled']
                : evaluation.decision.reasons,
          };

    const finalFilename = renameCandidate
      ? renameCandidate.filename
      : basename(filename);
    const debugSettings = toMediaDebugSettings(settings);

    await addHistoryItem({
      id: historyId,
      ts: Date.now(),
      path: renameCandidate ? renameCandidate.path : evaluation.originalPath,
      original: basename(filename),
      final: finalFilename,
      source: renameCandidate ? renameCandidate.source : evaluation.source,
      fileType: evaluation.fileType,
      phase: 'instant-baseline',
      reasonTags: evaluation.reasonTags,
      decision: historyDecision,
    });

    if (rawDownloadId !== undefined) {
      recordDownloadTracking(downloadTracking, rawDownloadId, {
        historyId,
        debug: debugSettings,
        url,
        filename: finalFilename,
        createdAt: Date.now(),
      });
    }

    if (debugContext) {
      debugLogger.finishContext(debugContext.downloadId, {
        evaluation: renameCandidate
          ? evaluation
          : {
              ...evaluation,
              decision: historyDecision,
            },
      });
    }

    // Schedule media metadata analysis in background (non-blocking)
    if (
      isMediaFileType(evaluation.fileType) &&
      url &&
      settings.metadataToggles.mediaSpecs &&
      typeEnabled &&
      !url.startsWith('data:')
    ) {
      const mediaRequest: MediaAnalysisRequest = {
        requestId: randomId(),
        historyId,
        downloadId,
        url,
        originalFilename: finalFilename,
        fileType: evaluation.fileType,
        debug: debugSettings,
      };

      logMediaDebug(debugSettings, 'queue-request', {
        requestId: mediaRequest.requestId,
        historyId,
        url,
      });

      // Fire and forget - don't block the download
      void enqueueMediaAnalysis(mediaRequest)
        .then((response) => {
          logMediaDebug(debugSettings, 'queue-response', {
            requestId: mediaRequest.requestId,
            status: response.status,
          });
          return applyMediaAnalysisResponse(
            historyId,
            url,
            mediaRequest.requestId,
            debugSettings,
            response,
            downloadId,
            readSettings,
          );
        })
        .catch((error: unknown) => {
          logMediaDebug(debugSettings, 'queue-failure', {
            requestId: mediaRequest.requestId,
            error:
              error instanceof Error
                ? error.message
                : 'Unknown media analysis error',
          });
        });
    }
  } catch (error) {
    console.error('Instant Baseline rename failed', error);
    if (!suggestionIssued) {
      controller.ensureDefault();
    }
  } finally {
    controller.finish();
  }
}

/**
 * Create the determining listener that processes download events.
 */
export function createDeterminingListener(
  pageContextService: PageContextService,
  readSettings: () => Settings,
  downloadTracking: Map<number, DownloadTrackingEntry>,
): DeterminingListener {
  return (item, suggest) => {
    void processDeterminingFilename(
      item,
      suggest,
      pageContextService,
      readSettings,
      downloadTracking,
    ).catch((error) => {
      console.error('Instant Baseline rename unhandled failure', error);
    });
    // Always return true since this implementation always calls suggest() asynchronously
    // via processDeterminingFilename. According to Chrome's downloads API, returning true
    // indicates that suggest() will be called asynchronously.
    return true;
  };
}
