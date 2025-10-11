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

export interface RenameOrchestratorHelpers {
  emitStatus(state: ConfirmToastStatusState, message?: string): Promise<void>;
}

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

  console.info('[NewName] PDF analysis rename scheduled', {
    historyId,
    delayMs: PDF_ANALYSIS_DELAY_MS,
    currentPath,
    targetName,
  });

  // Store current state in history for alarm handler to retrieve
  await updateHistoryItem(historyId, (item) => ({
    ...item,
    pendingAnalysisRename: {
      currentPath,
      currentName,
      targetName,
      scheduledAt: Date.now(),
    },
  }));

  // Schedule alarm (persists across service worker restarts)
  const alarmName = `pdf-analysis-${historyId}`;
  await browser.alarms.create(alarmName, {
    delayInMinutes: PDF_ANALYSIS_DELAY_MINUTES,
  });

  debugLogger.log('[RenameOrchestrator] PDF analysis alarm created', alarmName);
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
  console.info('[NewName] PDF analysis rename executing', { historyId });

  // Retrieve history item
  const item = await getHistoryItem(historyId);
  if (!item) {
    debugLogger.warn(
      '[RenameOrchestrator] History entry not found for PDF analysis',
      historyId,
    );
    return;
  }

  if (!item.pendingAnalysisRename) {
    debugLogger.log(
      '[RenameOrchestrator] No pending analysis rename found',
      historyId,
    );
    return;
  }

  const { currentPath, targetName } = item.pendingAnalysisRename;

  // Get directory handle
  const handle = await getStoredDirectoryHandle();
  if (!handle || !(await isHandleValid(handle))) {
    debugLogger.warn(
      '[RenameOrchestrator] Missing or invalid Downloads directory handle for analysis rename',
    );
    return;
  }

  console.info('[NewName] PDF analysis rename starting', {
    historyId,
    from: currentPath,
    to: targetName,
  });

  const result = await renameFile({
    relativePath: currentPath,
    newFilename: targetName,
    rootHandle: handle,
  });

  if (!result.success) {
    console.warn(
      '[NewName] PDF analysis rename failed',
      historyId,
      result.error,
    );
    debugLogger.warn(
      '[RenameOrchestrator] PDF analysis rename failed',
      historyId,
      result.error,
    );

    // Clear pending state even on failure
    await updateHistoryItem(historyId, (item) => ({
      ...item,
      pendingAnalysisRename: undefined,
    }));
    return;
  }

  // Update history with final result and clear pending state
  await updateHistoryItem(historyId, (item) =>
    applyHistoryUpdate(
      { ...item, pendingAnalysisRename: undefined },
      result.finalName,
      result.finalPath,
    ),
  );

  console.info('[NewName] PDF analysis rename complete', {
    historyId,
    finalName: result.finalName,
    finalPath: result.finalPath,
  });
  debugLogger.log(
    '[RenameOrchestrator] PDF analysis rename complete',
    historyId,
  );
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
  await schedulePdfAnalysisRename(entry, result.finalPath, result.finalName);
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
