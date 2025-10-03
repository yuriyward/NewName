/**
 * Download coordination logic for onDeterminingFilename events
 */
import type { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { DebugContext } from '@/entrypoints/shared/debug/types';
import { addHistoryItem } from '@/entrypoints/shared/history/history';
import { SUGGEST_TIMEOUT_MS } from '@/entrypoints/shared/integrations/mediainfo/constants';
import type { MediaDebugSettings } from '@/entrypoints/shared/integrations/mediainfo/debug';
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
  SettingsV1,
} from '@/entrypoints/shared/settings/settings';
import type { PageContextService } from '@/entrypoints/shared/state/page-context-service';
import {
  applyMediaAnalysisResponse,
  toMediaDebugSettings,
} from './media-orchestrator';

export interface DownloadTrackingEntry {
  historyId: string;
  debug?: MediaDebugSettings;
  url: string;
  filename: string;
  createdAt: number;
}

const DOWNLOAD_TRACKING_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const DOWNLOAD_TRACKING_MAX_ENTRIES = 200;
const DOWNLOAD_TRACKING_PRUNE_EVERY_N_ADDITIONS = 50;

let additionsSinceLastPrune = 0;

export function pruneDownloadTrackingMap(
  map: Map<number, DownloadTrackingEntry>,
  now = Date.now(),
): void {
  for (const [id, entry] of map) {
    if (now - entry.createdAt > DOWNLOAD_TRACKING_TTL_MS) {
      map.delete(id);
    }
  }

  if (map.size <= DOWNLOAD_TRACKING_MAX_ENTRIES) {
    return;
  }

  const entries = Array.from(map.entries()).sort(
    (a, b) => a[1].createdAt - b[1].createdAt,
  );
  const excess = map.size - DOWNLOAD_TRACKING_MAX_ENTRIES;
  for (let index = 0; index < excess; index += 1) {
    const [downloadId] = entries[index] ?? [];
    if (downloadId !== undefined) {
      map.delete(downloadId);
    }
  }
}

export type DeterminingListener = Parameters<
  typeof browser.downloads.onDeterminingFilename.addListener
>[0];

export type DeterminingItem = Parameters<DeterminingListener>[0];
export type SuggestCallback = Parameters<DeterminingListener>[1];
export type SuggestPayload = Parameters<SuggestCallback>[0];

/**
 * Generate a random ID for tracking downloads and history items.
 */
let fallbackRandomSeed = 0;

export function randomId(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto.getRandomValues === 'function') {
      const buffer = new Uint32Array(4);
      crypto.getRandomValues(buffer);
      return Array.from(buffer, (value) =>
        value.toString(16).padStart(8, '0'),
      ).join('');
    }
  }

  fallbackRandomSeed = (fallbackRandomSeed + 1) & 0xffff;
  const timeHex = Date.now().toString(16);
  const seedHex = fallbackRandomSeed.toString(16).padStart(4, '0');
  const randomHex = Math.random().toString(16).slice(2, 10);
  return `${timeHex}-${seedHex}-${randomHex}`;
}

/**
 * Extract the base filename from a path.
 */
export function basename(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts.pop() ?? path;
}

/**
 * Generate a fallback filename from a URL when no filename is provided.
 */
export function fallbackNameFromUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const segment = url.pathname.split('/').pop() ?? 'download';
    if (!segment) return 'download';
    try {
      const decoded = decodeURIComponent(segment);
      return decoded || 'download';
    } catch {
      return segment;
    }
  } catch {
    return 'download';
  }
}

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
  settings: SettingsV1,
  fileType: keyof SettingsV1['perType'],
): boolean {
  const behavior = settings.perType[fileType]?.behavior ?? 'auto';
  if (behavior === 'off') return false;
  return true;
}

/**
 * Controller for managing the suggest callback with timeout handling.
 */
export function createSuggestController(suggest: SuggestCallback) {
  let resolved = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
    if (resolved) return;
    resolved = true;
    try {
      suggest();
    } catch (error) {
      console.warn('Suggest callback failed after timeout', error);
    }
  }, SUGGEST_TIMEOUT_MS);

  function clearTimer() {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  }

  return {
    trySuggest(payload?: SuggestPayload): boolean {
      if (resolved) return false;
      try {
        if (payload) {
          suggest(payload);
        } else {
          suggest();
        }
        resolved = true;
        clearTimer();
        return true;
      } catch (error) {
        resolved = true;
        clearTimer();
        throw error;
      }
    },
    ensureDefault(): void {
      if (resolved) return;
      try {
        suggest();
      } catch (error) {
        console.warn('Suggest callback failed during fallback', error);
      } finally {
        resolved = true;
        clearTimer();
      }
    },
    finish(): void {
      if (resolved) return;
      resolved = true;
      clearTimer();
    },
  };
}

/**
 * Process the determining filename event and suggest a renamed filename if applicable.
 */
export async function processDeterminingFilename(
  item: DeterminingItem,
  suggest: SuggestCallback,
  pageContextService: PageContextService,
  readSettings: () => SettingsV1,
  downloadTracking: Map<number, DownloadTrackingEntry>,
): Promise<void> {
  const controller = createSuggestController(suggest);
  let suggestionIssued = false;
  try {
    await pageContextService.prune();

    const settings = readSettings();
    const url = item.finalUrl ?? item.url;
    const filename = item.filename ?? fallbackNameFromUrl(url);
    const rawDownloadId =
      typeof (item as { id?: number }).id === 'number'
        ? (item as { id: number }).id
        : undefined;
    const downloadId =
      rawDownloadId !== undefined ? String(rawDownloadId) : undefined;
    const initiatingTabId =
      typeof (item as { tabId?: number }).tabId === 'number'
        ? (item as { tabId?: number }).tabId
        : undefined;
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
      downloadTracking.set(rawDownloadId, {
        historyId,
        debug: debugSettings,
        url,
        filename: finalFilename,
        createdAt: Date.now(),
      });
      additionsSinceLastPrune += 1;
      if (additionsSinceLastPrune >= DOWNLOAD_TRACKING_PRUNE_EVERY_N_ADDITIONS) {
        pruneDownloadTrackingMap(downloadTracking);
        additionsSinceLastPrune = 0;
      }
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
  readSettings: () => SettingsV1,
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
