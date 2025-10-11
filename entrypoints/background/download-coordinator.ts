/**
 * Download coordination logic for onDeterminingFilename events
 */
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import type { PageContextService } from '@/entrypoints/shared/state/page-context-service';
import { basename } from '@/entrypoints/shared/utils/filename';
import { buildDownloadPlan } from './download-plan';
import { applyPostDownloadActions } from './download-post-actions';
import type { DownloadTrackingEntry } from './download-tracking';
import type {
  DeterminingItem,
  DeterminingListener,
  SuggestCallback,
  SuggestPayload,
} from './download-types';
import { maybeShowRenameOverlay } from './rename-overlay';
import type { SuggestController } from './suggest-controller';
import { createSuggestController } from './suggest-controller';
import type { ConfirmToastController } from './toast/confirmation-controller';

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
): Promise<void> {
  const controller = createSuggestController(suggest);
  let suggestionIssued = false;
  try {
    await pageContextService.prune();

    const plan = await buildDownloadPlan({
      item,
      pageContextService,
      readSettings,
    });

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
        });
      }
    } else {
      const submitted = trySuggestFilename(controller, suggestionOriginalPath);
      if (!submitted) {
        return;
      }
      suggestionIssued = true;
      return;
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
): DeterminingListener {
  return (item, suggest) => {
    void processDeterminingFilename(
      item,
      suggest,
      pageContextService,
      readSettings,
      downloadTracking,
      confirmToastController,
    ).catch((error) => {
      debugLogger.error('Instant Baseline rename unhandled failure', { error });
    });
    // Always return true since this implementation always calls suggest() asynchronously
    // via processDeterminingFilename. According to Chrome's downloads API, returning true
    // indicates that suggest() will be called asynchronously.
    return true;
  };
}
