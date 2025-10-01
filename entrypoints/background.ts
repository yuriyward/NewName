/**
 * Background service worker for download interception and renaming
 */
import { browser } from 'wxt/browser';
import { initializeBackgroundDebug } from '@/entrypoints/shared/debug/console-helpers';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { DebugContext } from '@/entrypoints/shared/debug/types';
import {
  addHistoryItem,
  type UpgradeProposal,
  updateHistoryItem,
} from '@/entrypoints/shared/history/history';
import type { MediaDebugSettings } from '@/entrypoints/shared/integrations/mediainfo/debug';
import { logMediaDebug } from '@/entrypoints/shared/integrations/mediainfo/debug';
import { enqueueMediaAnalysis } from '@/entrypoints/shared/integrations/mediainfo/media-analysis-queue';
import type {
  MediaAnalysisRequest,
  MediaAnalysisResponse,
} from '@/entrypoints/shared/integrations/mediainfo/messages';
import { registerInstallDateListener } from '@/entrypoints/shared/lifecycle/install-tracking';
import { onExtensionMessage } from '@/entrypoints/shared/messaging/extension-messaging';
import { generateMediaEnhancedFilename } from '@/entrypoints/shared/naming/policy-engine';
import {
  evaluateInstantBaseline,
  evaluateInstantBaselineDebug,
  type InstantBaselineComputation,
} from '@/entrypoints/shared/pipeline/instant-baseline-strategy';
import type { InstantBaselineEvaluation } from '@/entrypoints/shared/pipeline/instant-baseline-types';
import {
  type FileType,
  getLastKnownSettings,
  getSettings,
  type SettingsV1,
  subscribeSettings,
} from '@/entrypoints/shared/settings/settings';
import {
  type PageContextService,
  registerPageContextService,
} from '@/entrypoints/shared/state/page-context-service';

const randomId = (() => {
  let fallbackRandomSeed = 0;

  return function randomId(): string {
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
  };
})();

function basename(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts.pop() ?? path;
}

function fallbackNameFromUrl(rawUrl: string): string {
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

function toMediaDebugSettings(
  settings: SettingsV1,
): MediaDebugSettings | undefined {
  if (!settings.debug.enabled) {
    return undefined;
  }
  return {
    enabled: true,
    level: settings.debug.level,
  };
}

function isMediaFileType(
  fileType: FileType,
): fileType is Extract<FileType, 'audio' | 'video'> {
  return fileType === 'audio' || fileType === 'video';
}

async function applyMediaAnalysisResponse(
  historyId: string,
  url: string,
  requestId: string,
  debug: MediaDebugSettings | undefined,
  response: MediaAnalysisResponse,
  downloadId?: string,
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

function ensureSettingsCache() {
  let current: SettingsV1 = getLastKnownSettings();

  // Initialize debug logger with current settings
  debugLogger.setEnabled(current.debug.enabled);
  debugLogger.setLevel(current.debug.level);

  void getSettings().then((settings) => {
    current = settings;
    debugLogger.setEnabled(settings.debug.enabled);
    debugLogger.setLevel(settings.debug.level);
  });
  subscribeSettings((settings) => {
    current = settings;
    debugLogger.setEnabled(settings.debug.enabled);
    debugLogger.setLevel(settings.debug.level);
  });
  return () => current;
}

const readSettings = ensureSettingsCache();

const MEDIA_ANALYSIS_MAX_WAIT_MS = 1800;
const SUGGEST_TIMEOUT_MS = MEDIA_ANALYSIS_MAX_WAIT_MS + 400;
const PAGE_CONTEXT_PRUNE_INTERVAL_MS = 5 * 60_000;

interface DownloadTrackingEntry {
  historyId: string;
  debug?: MediaDebugSettings;
  url: string;
  filename: string;
}

const downloadTracking = new Map<number, DownloadTrackingEntry>();

type DeterminingListener = Parameters<
  typeof browser.downloads.onDeterminingFilename.addListener
>[0];

type DeterminingItem = Parameters<DeterminingListener>[0];
type SuggestCallback = Parameters<DeterminingListener>[1];
type SuggestPayload = Parameters<SuggestCallback>[0];

function createSuggestController(suggest: SuggestCallback) {
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

function shouldRenameType(
  settings: SettingsV1,
  fileType: keyof SettingsV1['perType'],
): boolean {
  const behavior = settings.perType[fileType]?.behavior ?? 'auto';
  if (behavior === 'off') return false;
  return true;
}

async function processDeterminingFilename(
  item: DeterminingItem,
  suggest: SuggestCallback,
  pageContextService: PageContextService,
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

function createDeterminingListener(
  pageContextService: PageContextService,
): DeterminingListener {
  return (item, suggest) => {
    void processDeterminingFilename(item, suggest, pageContextService).catch(
      (error) => {
        console.error('Instant Baseline rename unhandled failure', error);
      },
    );
    // Always return true since this implementation always calls suggest() asynchronously
    // via processDeterminingFilename. According to Chrome's downloads API, returning true
    // indicates that suggest() will be called asynchronously.
    return true;
  };
}

function initializeBackground(): void {
  registerInstallDateListener();
  initializeBackgroundDebug();

  const pageContextService = registerPageContextService();

  onExtensionMessage('resolveRuntimeContext', ({ sender }) => ({
    tabId: sender.tab?.id ?? undefined,
    frameId: sender.frameId,
    url: sender.url ?? sender.tab?.url ?? null,
  }));

  browser.tabs.onRemoved.addListener((tabId) => {
    void pageContextService.clear(tabId);
  });

  browser.downloads.onChanged.addListener((delta) => {
    const info = downloadTracking.get(delta.id);
    if (!info) return;

    const state = delta.state?.current;
    if (state === 'complete' || state === 'interrupted') {
      downloadTracking.delete(delta.id);

      void browser.downloads
        .search({ id: delta.id })
        .then(([item]) => {
          if (!item) {
            console.warn('[NewName] download info missing for id', delta.id);
            return;
          }

          const payload = {
            downloadId: delta.id,
            historyId: info.historyId,
            state,
            totalBytes:
              item.totalBytes !== undefined && item.totalBytes >= 0
                ? item.totalBytes
                : undefined,
            bytesReceived: item.bytesReceived,
            filename: item.filename ?? info.filename,
            url: info.url,
          };

          logMediaDebug(info.debug, 'download-bytes-final', payload);
          console.log('[NewName] download-bytes-final', payload);
        })
        .catch((error) => {
          console.error('Failed to log download bytes', error);
        });
    }
  });

  browser.downloads.onDeterminingFilename.addListener(
    createDeterminingListener(pageContextService),
  );

  setInterval(() => {
    void pageContextService.prune();
  }, PAGE_CONTEXT_PRUNE_INTERVAL_MS);

  const settings = readSettings();
  if (settings.debug.enabled) {
    console.log('[NewName Debug] Background ready', { id: browser.runtime.id });
  }
}

export default defineBackground(() => {
  initializeBackground();
});
