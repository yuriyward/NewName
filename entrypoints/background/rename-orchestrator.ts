/**
 * Orchestrates file rename operations in response to toast actions.
 */
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { isHandleValid } from '@/entrypoints/shared/filesystem/directory-picker';
import {
  clearStoredHandle,
  getStoredDirectoryHandle,
  updateLastVerified,
} from '@/entrypoints/shared/filesystem/handle-storage';
import { renameFile } from '@/entrypoints/shared/filesystem/rename-operations';
import { updateHistoryItem } from '@/entrypoints/shared/history/history';
import type { HistoryItem } from '@/entrypoints/shared/history/types';
import { splitPath } from '@/entrypoints/shared/pipeline/path-utils';
import {
  getSettings,
  updateSettings,
} from '@/entrypoints/shared/settings/settings';
import type {
  ConfirmToastDecisionMessage,
  ConfirmToastStatusState,
} from '@/entrypoints/shared/toast/types';
import { showSetupRequiredBadge } from '@/entrypoints/shared/ui/badge-manager';
import type { ConfirmToastEntry } from './toast/confirmation-controller';

export interface RenameOrchestratorHelpers {
  emitStatus(state: ConfirmToastStatusState, message?: string): Promise<void>;
}

function deriveRelativeOriginalPath(entry: ConfirmToastEntry): string {
  const { directory } = splitPath(entry.proposal.proposedPath);
  return directory
    ? `${directory}/${entry.proposal.originalFilename}`
    : entry.proposal.originalFilename;
}

function determineFinalFilename(
  entry: ConfirmToastEntry,
  decision: ConfirmToastDecisionMessage,
): string {
  const edited = decision.editedFilename?.trim();
  if (edited && edited.length > 0) {
    return edited;
  }
  return entry.proposal.proposedFilename;
}

function applyHistoryUpdate(
  item: HistoryItem,
  entry: ConfirmToastEntry,
  finalName: string,
  finalPath: string,
): HistoryItem {
  const isContextualUpgrade =
    entry.proposal.triggerSources.includes('contextual-upgrade') ||
    item.upgrade?.source === 'ai';
  const nextReasonTags =
    isContextualUpgrade && item.upgrade?.reasonTags
      ? item.upgrade.reasonTags
      : item.reasonTags;

  return {
    ...item,
    final: finalName,
    path: finalPath,
    phase: isContextualUpgrade ? 'contextual-upgrade' : item.phase,
    reasonTags: isContextualUpgrade ? nextReasonTags : item.reasonTags,
  };
}

/**
 * Execute rename for "Approve" action (or auto-apply).
 */
export async function executeApply(
  entry: ConfirmToastEntry,
  decision: ConfirmToastDecisionMessage,
  helpers: RenameOrchestratorHelpers,
): Promise<void> {
  debugLogger.log('[RenameOrchestrator] Execute Apply', entry.historyId);

  const handle = await getStoredDirectoryHandle();
  if (!handle || !(await isHandleValid(handle))) {
    debugLogger.warn(
      '[RenameOrchestrator] Missing or invalid Downloads directory handle',
    );

    // Clear stored handle since it's no longer valid
    await clearStoredHandle().catch((error) => {
      debugLogger.warn(
        '[RenameOrchestrator] Failed to clear invalid handle',
        error,
      );
    });

    // Show badge to prompt re-onboarding
    await showSetupRequiredBadge().catch((error) => {
      debugLogger.warn(
        '[RenameOrchestrator] Failed to show setup badge',
        error,
      );
    });

    // Show helpful message with action
    await helpers.emitStatus(
      'permission-denied',
      'File access was reset. Click the extension icon to set up again.',
    );
    return;
  }

  await updateLastVerified().catch((error) => {
    debugLogger.warn(
      '[RenameOrchestrator] Failed to update handle metadata',
      error,
    );
  });

  const relativePath = deriveRelativeOriginalPath(entry);
  const finalFilename = determineFinalFilename(entry, decision);

  const result = await renameFile({
    relativePath,
    newFilename: finalFilename,
    rootHandle: handle,
  });

  if (!result.success) {
    debugLogger.error('[RenameOrchestrator] Rename failed', {
      historyId: entry.historyId,
      error: result.error,
      retries: result.retriesUsed,
    });
    await helpers.emitStatus(
      'error',
      result.error ?? 'Unable to rename file. Please try again.',
    );
    return;
  }

  try {
    const updated = await updateHistoryItem(entry.historyId, (item) =>
      applyHistoryUpdate(item, entry, result.finalName, result.finalPath),
    );
    if (!updated) {
      debugLogger.warn(
        '[RenameOrchestrator] History entry missing during rename update',
        entry.historyId,
      );
    }
  } catch (error) {
    debugLogger.warn(
      '[RenameOrchestrator] Failed to update history after rename',
      error,
    );
  }

  debugLogger.log('[RenameOrchestrator] Apply complete', {
    historyId: entry.historyId,
    finalName: result.finalName,
    method: result.method,
  });
  await helpers.emitStatus('applied');
}

/**
 * Execute "Keep original" action.
 */
export async function executeKeep(
  entry: ConfirmToastEntry,
  helpers: RenameOrchestratorHelpers,
): Promise<void> {
  debugLogger.log('[RenameOrchestrator] Execute Keep', entry.historyId);

  try {
    const updated = await updateHistoryItem(entry.historyId, (item) => ({
      ...item,
      final: item.original,
    }));
    if (!updated) {
      debugLogger.warn(
        '[RenameOrchestrator] History entry missing for keep-original',
        entry.historyId,
      );
    }
  } catch (error) {
    debugLogger.warn(
      '[RenameOrchestrator] Failed to update history for keep-original',
      error,
    );
  }

  await helpers.emitStatus('kept');
}

/**
 * Execute "Always apply" action.
 */
export async function executeAlwaysApply(
  entry: ConfirmToastEntry,
  decision: ConfirmToastDecisionMessage,
  helpers: RenameOrchestratorHelpers,
): Promise<void> {
  debugLogger.log('[RenameOrchestrator] Execute Always Apply', entry.historyId);

  try {
    const current = await getSettings();
    await updateSettings({
      perType: {
        ...current.perType,
        [entry.proposal.fileType]: {
          behavior: 'auto',
        },
      },
    });
  } catch (error) {
    debugLogger.warn(
      '[RenameOrchestrator] Failed to update auto-apply settings',
      error,
    );
  }

  await executeApply(entry, decision, helpers);
}
