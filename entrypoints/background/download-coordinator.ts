/**
 * Download coordination logic for onDeterminingFilename events
 */
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  buildManagedPath,
  normalizeDownloadPath,
} from '@/entrypoints/shared/filesystem/path-helpers';
import { logMediaDebug } from '@/entrypoints/shared/integrations/mediainfo/debug';
import { enqueueMediaAnalysis } from '@/entrypoints/shared/integrations/mediainfo/media-analysis-queue';
import type {
  MediaAnalysisRequest,
  MediaAnalysisResponse,
} from '@/entrypoints/shared/integrations/mediainfo/messages';
import { generateMediaEnhancedFilename } from '@/entrypoints/shared/naming/policy-engine';
import type {
  InstantBaselineEvaluation,
  InstantBaselineRenameProposal,
} from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import type { PageContextService } from '@/entrypoints/shared/state/page-context-service';
import { basename } from '@/entrypoints/shared/utils/filename';
import { randomId } from '@/entrypoints/shared/utils/id';
import type { DownloadPlan } from './download-plan';
import { buildDownloadPlan } from './download-plan';
import { applyPostDownloadActions } from './download-post-actions';
import type { DownloadTrackingEntry } from './download-tracking';
import type {
  DeterminingItem,
  DeterminingListener,
  SuggestCallback,
  SuggestPayload,
} from './download-types';
import { isMediaFileType } from './download-utils';
import { maybeShowRenameOverlay } from './rename-overlay';
import type { SuggestController } from './suggest-controller';
import { createSuggestController } from './suggest-controller';
import type { ConfirmToastController } from './toast/confirmation-controller';
import type { ScheduleUpgradeAnalysisParams } from './upgrade/types';

/**
 * Process the determining filename event and suggest a renamed filename if applicable.
 */
export async function processDeterminingFilename(
  item: DeterminingItem,
  suggest: SuggestCallback,
  pageContextService: PageContextService,
  readSettings: () => Settings,
  downloadTracking: Map<number, DownloadTrackingEntry>,
  confirmToastController: ConfirmToastController,
  scheduleUpgradeAnalysis: (
    params: ScheduleUpgradeAnalysisParams,
  ) => Promise<void>,
): Promise<void> {
  const controller = createSuggestController(suggest);
  let suggestionIssued = false;
  try {
    await pageContextService.prune();

    let plan = await buildDownloadPlan({
      item,
      pageContextService,
      readSettings,
    });

    let prefetchedMedia:
      | {
          request: MediaAnalysisRequest;
          response: MediaAnalysisResponse;
        }
      | undefined;

    const inlineResult = await tryInlineMediaRename(plan);
    if (inlineResult) {
      prefetchedMedia = inlineResult.prefetchedMedia;
      plan = {
        ...plan,
        evaluation: inlineResult.evaluation,
        renameCandidate: inlineResult.renameCandidate,
        renameRelativePath: inlineResult.renameRelativePath,
        suggestionRenamePath: inlineResult.suggestionRenamePath,
        confirmRoute: inlineResult.shouldSkipConfirm
          ? { kind: 'skip', reason: 'inline-media' }
          : plan.confirmRoute,
      };
    }

    const {
      settings,
      filename,
      historyId,
      downloadId,
      initiatingTabId,
      renameCandidate,
      suggestionOriginalPath,
      suggestionRenamePath,
      confirmRoute,
      sensitiveDetection,
      evaluation,
      typeEnabled,
      renameRelativePath,
      originalRelativePath,
      managedPrefix,
    } = plan;

    const baseFilename = basename(filename);

    if (renameCandidate) {
      const proposedDisplayPath =
        managedPrefix !== null ? suggestionRenamePath : renameRelativePath;

      if (confirmRoute.kind === 'toast') {
        const submitted = trySuggestFilename(
          controller,
          suggestionOriginalPath,
        );
        if (!submitted) {
          return;
        }
        suggestionIssued = true;
        try {
          await confirmToastController.queueConfirmation({
            historyId,
            downloadId,
            originalFilename: baseFilename,
            proposedFilename: renameCandidate.filename,
            proposedPath: renameRelativePath,
            displayProposedPath: proposedDisplayPath,
            fileType: evaluation.fileType,
            mode: settings.mode,
            reasonTags: evaluation.reasonTags,
            sensitiveReasons: sensitiveDetection.reasons,
            sensitiveMatches: sensitiveDetection.matches,
            triggerSources: confirmRoute.sources,
            autoApplyDelaySeconds: confirmRoute.autoApplyDelaySeconds,
            allowAlwaysApply: settings.mode !== 'careful',
            target: initiatingTabId,
          });
        } catch (error) {
          debugLogger.error(
            '[DownloadCoordinator] Failed to queue confirm toast; falling back to direct rename',
            { error },
          );
          const fallbackSubmitted = trySuggestFilename(
            controller,
            suggestionRenamePath,
          );
          if (!fallbackSubmitted) {
            return;
          }
          suggestionIssued = true;
          debugLogger.log(
            '[NewName] queueConfirmation failed, showing rename overlay',
          );
          await maybeShowRenameOverlay({
            settings,
            tabId: initiatingTabId,
            originalFilename: baseFilename,
            finalFilename: renameCandidate.filename,
            downloadId,
            kind: 'instant-baseline',
          });
        }
      } else {
        const submitted = trySuggestFilename(controller, suggestionRenamePath);
        if (!submitted) {
          return;
        }
        suggestionIssued = true;
        debugLogger.log('[NewName] Auto rename overlay dispatch', {
          tabId: initiatingTabId,
          original: baseFilename,
          final: renameCandidate.filename,
        });
        await maybeShowRenameOverlay({
          settings,
          tabId: initiatingTabId,
          originalFilename: baseFilename,
          finalFilename: renameCandidate.filename,
          downloadId,
          kind: 'instant-baseline',
        });
      }
    } else {
      const submitted = trySuggestFilename(controller, suggestionOriginalPath);
      if (!submitted) {
        return;
      }
      suggestionIssued = true;
    }

    const finalFilename = renameCandidate
      ? renameCandidate.filename
      : baseFilename;

    await applyPostDownloadActions({
      plan,
      evaluation,
      renameCandidate,
      typeEnabled,
      finalFilename,
      renameRelativePath,
      originalRelativePath,
      downloadTracking,
      readSettings,
      scheduleUpgradeAnalysis,
      prefetchedMedia,
    });
  } catch (error) {
    debugLogger.error('Instant Baseline rename failed', { error });
    if (!suggestionIssued) {
      controller.ensureDefault();
    }
  } finally {
    controller.finish();
  }
}

const INLINE_MEDIA_TIMEOUT_MS = 5_000;

interface InlineMediaResult {
  evaluation: InstantBaselineEvaluation;
  renameCandidate: InstantBaselineRenameProposal | undefined;
  renameRelativePath: string;
  suggestionRenamePath: string;
  prefetchedMedia: {
    request: MediaAnalysisRequest;
    response: MediaAnalysisResponse;
  };
  shouldSkipConfirm: boolean;
}

async function tryInlineMediaRename(
  plan: DownloadPlan,
): Promise<InlineMediaResult | null> {
  const { renameCandidate } = plan;
  if (!renameCandidate) {
    return null;
  }
  if (!isMediaFileType(plan.evaluation.fileType)) {
    return null;
  }
  if (!plan.settings.metadataToggles.mediaSpecs) {
    return null;
  }
  if (!plan.url || plan.url.startsWith('data:')) {
    return null;
  }

  const request: MediaAnalysisRequest = {
    requestId: randomId(),
    historyId: plan.historyId,
    downloadId: plan.downloadId,
    url: plan.url,
    originalFilename: renameCandidate.filename,
    fileType: plan.evaluation.fileType,
    debug: plan.debugSettings,
  };

  logMediaDebug(plan.debugSettings, 'queue-request', {
    requestId: request.requestId,
    historyId: plan.historyId,
    url: plan.url,
  });

  let response: MediaAnalysisResponse;
  try {
    response = await withTimeout(
      enqueueMediaAnalysis(request),
      INLINE_MEDIA_TIMEOUT_MS,
      () =>
        logMediaDebug(plan.debugSettings, 'inline-media-timeout', {
          requestId: request.requestId,
          timeoutMs: INLINE_MEDIA_TIMEOUT_MS,
        }),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'inline-media-error';
    logMediaDebug(plan.debugSettings, 'inline-media-failed', {
      requestId: request.requestId,
      error: message,
    });
    return null;
  }

  logMediaDebug(plan.debugSettings, 'queue-response', {
    requestId: request.requestId,
    status: response.status,
  });

  if (response.status !== 'success') {
    return {
      evaluation: plan.evaluation,
      renameCandidate,
      renameRelativePath: plan.renameRelativePath,
      suggestionRenamePath: plan.suggestionRenamePath,
      prefetchedMedia: { request, response },
      shouldSkipConfirm: false,
    };
  }

  const { settings } = plan;
  const enhanced = generateMediaEnhancedFilename(
    renameCandidate.filename,
    response.summary,
    plan.evaluation.fileType,
    {
      maxLength: settings.maxLen,
      separator: settings.separator,
      transliterateAscii: settings.transliterateAscii,
    },
  );

  const newFilename = enhanced.filename;

  const renameRelativePath = normalizeDownloadPath(
    replaceFilename(renameCandidate.path, newFilename),
  );

  const suggestionRenamePath =
    plan.managedPrefix !== null
      ? buildManagedPath(plan.managedPrefix, renameRelativePath)
      : renameRelativePath;

  const updatedRename: InstantBaselineRenameProposal = {
    ...renameCandidate,
    filename: newFilename,
    path: renameRelativePath,
    reasonTags: appendUniqueTags(renameCandidate.reasonTags, ['media-specs']),
    source: 'metadata',
  };

  const updatedEvaluation: InstantBaselineEvaluation = {
    ...plan.evaluation,
    rename: updatedRename,
    reasonTags: appendUniqueTags(plan.evaluation.reasonTags, ['media-specs']),
    decision: {
      ...plan.evaluation.decision,
      confidence: 100,
      reasons: appendUniqueTags(plan.evaluation.decision.reasons, [
        'metadata-inline',
      ]),
    },
    source: 'metadata',
  };

  return {
    evaluation: updatedEvaluation,
    renameCandidate: updatedRename,
    renameRelativePath,
    suggestionRenamePath,
    prefetchedMedia: { request, response },
    shouldSkipConfirm: true,
  };
}

function appendUniqueTags(original: string[], extras: string[]): string[] {
  const next = [...original];
  for (const tag of extras) {
    if (!next.includes(tag)) {
      next.push(tag);
    }
  }
  return next;
}

function replaceFilename(path: string, filename: string): string {
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash === -1) {
    return filename;
  }
  return `${path.slice(0, lastSlash + 1)}${filename}`;
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new Error('media-inline-timeout'));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function trySuggestFilename(
  controller: SuggestController<SuggestPayload>,
  path: string | null,
): boolean {
  const trimmed = path?.trim() ?? '';
  if (trimmed.length > 0) {
    return controller.trySuggest({ filename: trimmed });
  }
  return controller.trySuggest();
}

/**
 * Create the determining listener that processes download events.
 */
export function createDeterminingListener(
  pageContextService: PageContextService,
  readSettings: () => Settings,
  downloadTracking: Map<number, DownloadTrackingEntry>,
  confirmToastController: ConfirmToastController,
  scheduleUpgradeAnalysis: (
    params: ScheduleUpgradeAnalysisParams,
  ) => Promise<void>,
): DeterminingListener {
  return (item, suggest) => {
    void processDeterminingFilename(
      item,
      suggest,
      pageContextService,
      readSettings,
      downloadTracking,
      confirmToastController,
      scheduleUpgradeAnalysis,
    ).catch((error) => {
      debugLogger.error('Instant Baseline rename unhandled failure', { error });
    });
    // Always return true since this implementation always calls suggest() asynchronously
    // via processDeterminingFilename. According to Chrome's downloads API, returning true
    // indicates that suggest() will be called asynchronously.
    return true;
  };
}
