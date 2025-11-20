/**
 * Queues upgrade confirmation toasts for user approval
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type {
  HistoryItem,
  UpgradeProposal,
} from '@/entrypoints/shared/history/types';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import type { DownloadTrackingEntry } from '../download-tracking';
import type { ConfirmToastController } from '../toast/confirmation-controller';

export interface QueueUpgradeToastParams {
  proposal: UpgradeProposal;
  historyItem: HistoryItem;
  downloadId: number;
  settings: Settings;
  tracking?: DownloadTrackingEntry;
  sourceLabel: string;
  confidenceValue: number;
}

export interface QueueUpgradeToastDeps {
  confirmToastController: ConfirmToastController;
}

/**
 * Queues a confirmation toast for an upgrade proposal
 * Used for lower-confidence AI renames that require user confirmation
 */
export async function queueUpgradeToast(
  {
    proposal,
    historyItem,
    downloadId,
    settings,
    tracking,
    sourceLabel,
    confidenceValue,
  }: QueueUpgradeToastParams,
  deps: QueueUpgradeToastDeps,
): Promise<void> {
  const { confirmToastController } = deps;

  // Lower confidence or non-AI: Show confirmation toast with countdown
  const autoApplyDelaySeconds = proposal.autoApply
    ? settings.confirmToast.autoApplyDelaySeconds
    : null;

  try {
    await confirmToastController.queueConfirmation({
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
      autoApplyDelaySeconds,
      allowAlwaysApply: settings.mode !== 'careful',
      target: tracking?.tabId,
    });

    debugLogger.log(`[UpgradeCoordinator] Upgrade toast queued${sourceLabel}`, {
      historyId: historyItem.id,
      downloadId,
      source: proposal.source,
      confidenceScore: confidenceValue,
    });
  } catch (error) {
    debugLogger.error(
      `[UpgradeCoordinator] Queue confirmation failed${sourceLabel}`,
      {
        historyId: historyItem.id,
        downloadId,
        error,
      },
    );
  }
}
