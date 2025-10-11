/**
 * Orchestrates file rename operations in response to toast actions.
 */
import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { isHandleValid } from '@/entrypoints/shared/filesystem/directory-picker';
import {
  getStoredDirectoryHandle,
  updateLastVerified,
} from '@/entrypoints/shared/filesystem/handle-storage';
import { renameFile } from '@/entrypoints/shared/filesystem/rename-operations';
import {
  getHistoryItem,
  type HistoryItem,
  updateHistoryItem,
} from '@/entrypoints/shared/history/history';
import {
  splitPath,
  stripExtension,
} from '@/entrypoints/shared/pipeline/path-utils';
import {
  getSettings,
  updateSettings,
} from '@/entrypoints/shared/settings/settings';
import type {
  ConfirmToastDecisionMessage,
  ConfirmToastStatusState,
} from '@/entrypoints/shared/toast/types';
import type { ConfirmToastEntry } from './toast/confirmation-controller';

const PDF_ANALYSIS_DELAY_MS = 5_000;
const PDF_ANALYSIS_DELAY_MINUTES = PDF_ANALYSIS_DELAY_MS / 60_000;
const MAX_PENDING_ANALYSIS_AGE_MS = 24 * 60 * 60 * 1_000; // 24 hours

export interface RenameOrchestratorHelpers {
  emitStatus(state: ConfirmToastStatusState, message?: string): Promise<void>;
}

// TODO(#???): Temporary Phase 1 placeholder until real PDF analysis rename lands.
// Keeps the initial integration observable in builds without touching real filenames.
function appendTestSuffix(filename: string): string {
  const { base, extension } = stripExtension(filename);
  if (base.endsWith('-test')) {
    return filename;
  }
  const updatedBase = `${base}-test`;
  return extension ? `${updatedBase}.${extension}` : updatedBase;
}

/**
 * Core logic for scheduling PDF analysis alarm
 */
async function scheduleAnalysisAlarm(
  historyId: string,
  currentPath: string,
  currentName: string,
  fileType: string,
): Promise<void> {
  // Validate inputs
  if (!historyId || historyId.trim().length === 0) {
    debugLogger.error(
      '[RenameOrchestrator] Invalid historyId for analysis scheduling',
    );
    return;
  }

  if (fileType !== 'pdf') {
    debugLogger.log(
      '[RenameOrchestrator] Skipping analysis rename for file type',
      fileType,
    );
    return;
  }

  const targetName = appendTestSuffix(currentName);
  if (targetName === currentName) {
    debugLogger.log(
      '[RenameOrchestrator] Analysis rename already applied to filename',
      currentName,
    );
    return;
  }

  if (!targetName || targetName.trim().length === 0) {
    debugLogger.error(
      '[RenameOrchestrator] Generated invalid target name for analysis',
      currentName,
    );
    return;
  }

  debugLogger.log('[RenameOrchestrator] Scheduling PDF analysis rename', {
    historyId,
    delayMs: PDF_ANALYSIS_DELAY_MS,
    currentPath,
    targetName,
  });

  try {
    // Store current state in history for alarm handler to retrieve
    const updated = await updateHistoryItem(historyId, (item) => ({
      ...item,
      pendingAnalysisRename: {
        currentPath,
        currentName,
        targetName,
        scheduledAt: Date.now(),
      },
    }));

    if (!updated) {
      debugLogger.warn(
        '[RenameOrchestrator] Failed to update history for analysis scheduling',
        historyId,
      );
      return;
    }

    // Schedule alarm (persists across service worker restarts)
    const alarmName = `pdf-analysis-${historyId}`;
    await browser.alarms.create(alarmName, {
      delayInMinutes: PDF_ANALYSIS_DELAY_MINUTES,
    });

    debugLogger.log(
      '[RenameOrchestrator] PDF analysis alarm created',
      alarmName,
    );
  } catch (error) {
    debugLogger.error(
      '[RenameOrchestrator] Failed to schedule PDF analysis alarm',
      error,
    );
  }
}

/**
 * Schedule PDF analysis rename for auto-downloaded files (called from download-coordinator)
 */
export async function schedulePdfAnalysisForDownload(params: {
  historyId: string;
  currentPath: string;
  currentFilename: string;
  fileType: string;
}): Promise<void> {
  await scheduleAnalysisAlarm(
    params.historyId,
    params.currentPath,
    params.currentFilename,
    params.fileType,
  );
}

/**
 * Schedule a delayed PDF analysis rename using chrome.alarms API
 * (survives service worker termination unlike setTimeout)
 */
async function schedulePdfAnalysisRename(
  entry: ConfirmToastEntry,
  currentPath: string,
  currentName: string,
): Promise<void> {
  await scheduleAnalysisAlarm(
    entry.historyId,
    currentPath,
    currentName,
    entry.proposal.fileType,
  );
}

/**
 * Execute PDF analysis rename (called by alarm handler)
 * Can be invoked even after service worker restart
 */
export async function executePdfAnalysisRename(
  historyId: string,
): Promise<void> {
  debugLogger.log('[RenameOrchestrator] Executing PDF analysis rename', {
    historyId,
  });

  try {
    // Validate input
    if (!historyId || historyId.trim().length === 0) {
      debugLogger.error(
        '[RenameOrchestrator] Invalid historyId for PDF analysis execution',
      );
      return;
    }

    // Retrieve history item
    const item = await getHistoryItem(historyId);
    if (!item) {
      debugLogger.warn(
        '[RenameOrchestrator] History entry not found for PDF analysis',
        historyId,
      );
      // Clear the alarm since history item is missing
      await browser.alarms.clear(`pdf-analysis-${historyId}`);
      return;
    }

    if (!item.pendingAnalysisRename) {
      debugLogger.log(
        '[RenameOrchestrator] No pending analysis rename found',
        historyId,
      );
      return;
    }

    const { currentPath, targetName, scheduledAt } =
      item.pendingAnalysisRename;

    // Validate pending state
    if (!currentPath || !targetName || !Number.isFinite(scheduledAt)) {
      debugLogger.error(
        '[RenameOrchestrator] Invalid pending state for PDF analysis',
        { historyId, currentPath, targetName, scheduledAt },
      );
      await clearPendingAnalysisState(historyId);
      return;
    }

    // Get directory handle and verify permissions
    const handle = await getStoredDirectoryHandle();
    if (!handle || !(await isHandleValid(handle))) {
      debugLogger.warn(
        '[RenameOrchestrator] Missing or invalid Downloads directory handle for analysis rename',
        historyId,
      );
      const pendingAge = Date.now() - scheduledAt;
      if (pendingAge > MAX_PENDING_ANALYSIS_AGE_MS) {
        debugLogger.warn(
          '[RenameOrchestrator] Pending analysis rename expired after permission loss',
          { historyId, pendingAge },
        );
        await clearPendingAnalysisState(historyId);
        await browser.alarms.clear(`pdf-analysis-${historyId}`);
      }
      // Don't clear pending state immediately; user might restore permissions.
      return;
    }

    debugLogger.log('[RenameOrchestrator] Starting PDF analysis rename', {
      historyId,
      from: currentPath,
      to: targetName,
    });

    // Execute rename
    const result = await renameFile({
      relativePath: currentPath,
      newFilename: targetName,
      rootHandle: handle,
    });

    if (!result.success) {
      debugLogger.warn('[RenameOrchestrator] PDF analysis rename failed', {
        historyId,
        error: result.error,
        retriesUsed: result.retriesUsed,
      });

      // Clear pending state even on failure
      await clearPendingAnalysisState(historyId);
      return;
    }

    // Update history with final result and clear pending state
    try {
      await updateHistoryItem(historyId, (item) =>
        applyHistoryUpdate(
          { ...item, pendingAnalysisRename: undefined },
          result.finalName,
          result.finalPath,
        ),
      );

      debugLogger.log('[RenameOrchestrator] PDF analysis rename complete', {
        historyId,
        finalName: result.finalName,
        finalPath: result.finalPath,
        method: result.method,
      });
    } catch (error) {
      debugLogger.error(
        '[RenameOrchestrator] Failed to update history after PDF analysis rename',
        { historyId, error },
      );
    }
  } catch (error) {
    debugLogger.error('[RenameOrchestrator] PDF analysis rename exception', {
      historyId,
      error,
    });
    // Attempt to clear pending state on unexpected errors
    await clearPendingAnalysisState(historyId).catch(() => {
      // Ignore cleanup errors
    });
  }
}

/**
 * Helper to clear pending analysis state from history
 */
async function clearPendingAnalysisState(historyId: string): Promise<void> {
  try {
    await updateHistoryItem(historyId, (item) => ({
      ...item,
      pendingAnalysisRename: undefined,
    }));
    debugLogger.log(
      '[RenameOrchestrator] Cleared pending analysis state',
      historyId,
    );
  } catch (error) {
    debugLogger.warn(
      '[RenameOrchestrator] Failed to clear pending analysis state',
      { historyId, error },
    );
  }
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
  finalName: string,
  finalPath: string,
): HistoryItem {
  return {
    ...item,
    final: finalName,
    path: finalPath,
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
    await helpers.emitStatus(
      'permission-denied',
      'Downloads access required to rename files.',
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
      applyHistoryUpdate(item, result.finalName, result.finalPath),
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

  // Schedule delayed PDF analysis rename (uses alarms, survives service worker termination)
  // Fire and forget - don't block on scheduling
  void schedulePdfAnalysisRename(
    entry,
    result.finalPath,
    result.finalName,
  ).catch((error) => {
    debugLogger.error(
      '[RenameOrchestrator] Failed to schedule PDF analysis from apply',
      { historyId: entry.historyId, error },
    );
  });
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
