/**
 * Applies silent renames for high-confidence or metadata-based upgrades
 */

import { SILENT_RENAME_THRESHOLD } from '@/entrypoints/shared/constants/confidence-thresholds';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type {
  HistoryItem,
  UpgradeProposal,
} from '@/entrypoints/shared/history/types';
import { sendShowRenameToast } from '@/entrypoints/shared/messaging/core-messages';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import { randomId } from '@/entrypoints/shared/utils/id';
import type { DownloadTrackingEntry } from '../download-tracking';
import { executeApply } from '../rename-orchestrator';
import type { ConfirmToastEntry } from '../toast/confirmation-controller';

export interface ApplySilentRenameParams {
  proposal: UpgradeProposal;
  historyItem: HistoryItem;
  downloadId: number;
  settings: Settings;
  tracking?: DownloadTrackingEntry;
  sourceLabel: string;
  confidenceValue: number;
}

/**
 * Applies a rename silently without user confirmation
 * Used for high-confidence AI renames or metadata-based renames
 */
export async function applySilentRename({
  proposal,
  historyItem,
  downloadId,
  settings,
  tracking,
  sourceLabel,
  confidenceValue,
}: ApplySilentRenameParams): Promise<void> {
  const logLabel =
    proposal.source === 'metadata'
      ? '[UpgradeCoordinator] Applying metadata rename silently'
      : '[UpgradeCoordinator] Applying high-confidence rename silently';

  debugLogger.log(`${logLabel}${sourceLabel}`, {
    historyId: historyItem.id,
    downloadId,
    confidence: confidenceValue,
    threshold: SILENT_RENAME_THRESHOLD,
    source: proposal.source,
  });

  const toastId = randomId();
  const entry: ConfirmToastEntry = {
    proposal: {
      toastId,
      createdAt: Date.now(),
      historyId: historyItem.id,
      downloadId: String(downloadId),
      originalFilename: historyItem.final,
      proposedFilename: proposal.proposedFilename,
      proposedPath: proposal.proposedPath,
      displayProposedPath: proposal.proposedPath,
      fileType: historyItem.fileType,
      mode: settings.mode,
      reasonTags: proposal.reasonTags ?? ['contextual-upgrade'],
      sensitiveReasons: [],
      sensitiveMatches: [],
      triggerSources: ['contextual-upgrade'],
      autoApplyAt: null,
      autoApplyDelaySeconds: null,
      allowAutoApply: false,
      allowAlwaysApply: false,
      autoApplyRemainingMs: null,
    },
    historyId: historyItem.id,
    autoApplyRemainingMs: null,
  };

  try {
    let renameSuccessful = false;
    await executeApply(
      entry,
      {
        toastId,
        historyId: historyItem.id,
        downloadId: String(downloadId),
        action: 'approve',
      },
      {
        emitStatus: async (state, message) => {
          if (state === 'applied') {
            renameSuccessful = true;
          }
          debugLogger.log(`${logLabel} status${sourceLabel}`, {
            state,
            message,
          });
        },
      },
    );

    // Show rename-complete notification if successful and we have a tab
    if (renameSuccessful && tracking?.tabId) {
      await sendShowRenameToast(
        {
          toast: {
            toastId,
            createdAt: Date.now(),
            originalFilename: historyItem.final,
            finalFilename: proposal.proposedFilename,
            downloadId: String(downloadId),
            durationMs: 0,
          },
        },
        tracking.tabId,
      );
    }

    debugLogger.log(`${logLabel} completed${sourceLabel}`, {
      historyId: historyItem.id,
      downloadId,
    });
  } catch (error) {
    debugLogger.error(`${logLabel} failed${sourceLabel}`, {
      historyId: historyItem.id,
      downloadId,
      error,
    });
  }
}
