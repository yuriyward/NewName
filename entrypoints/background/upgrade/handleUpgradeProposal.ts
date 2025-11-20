/**
 * Handles upgrade proposal processing and application
 * Orchestrates the complete upgrade workflow by delegating to specialized handlers
 */

import { getAutoApplyBehavior } from '@/entrypoints/shared/constants/confidence-thresholds';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { updateHistoryItem } from '@/entrypoints/shared/history/history';
import type {
  HistoryItem,
  UpgradeProposal,
} from '@/entrypoints/shared/history/types';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import type { DownloadTrackingEntry } from '../download-tracking';
import type { ConfirmToastController } from '../toast/confirmation-controller';
import { applySilentRename } from './applySilentRename';
import { queueUpgradeToast } from './queueUpgradeToast';

type UpgradeProposalSourceContext =
  | 'downloads-onChanged'
  | 'scheduler'
  | 'metadata';

export interface HandleUpgradeProposalParams {
  proposal: UpgradeProposal;
  historyId: string;
  historyItem: HistoryItem;
  downloadId: number;
  settings: Settings;
  tracking?: DownloadTrackingEntry;
  source: UpgradeProposalSourceContext;
}

export interface HandleUpgradeProposalDeps {
  confirmToastController: ConfirmToastController;
}

/**
 * Orchestrates the upgrade proposal workflow
 * - Updates history with the proposal
 * - Determines whether to apply silently or show confirmation toast
 * - Delegates to appropriate handler
 */
export async function handleUpgradeProposal(
  {
    proposal,
    historyId,
    historyItem,
    downloadId,
    settings,
    tracking,
    source,
  }: HandleUpgradeProposalParams,
  deps: HandleUpgradeProposalDeps,
): Promise<HistoryItem> {
  const sourceLabel = source === 'scheduler' ? ' from scheduler' : '';
  let effectiveHistoryItem: HistoryItem = historyItem;

  // Update history with the proposal
  try {
    const updated = await updateHistoryItem(historyId, (item) => ({
      ...item,
      pendingUpgradeAnalysis: undefined,
      upgrade: proposal,
    }));
    if (updated) {
      effectiveHistoryItem = updated;
    }
  } catch (error) {
    debugLogger.warn(
      `[UpgradeCoordinator] Failed to persist upgrade proposal${sourceLabel}`,
      {
        historyId,
        error,
      },
    );
  }

  // Determine if this should be a silent rename or confirmation toast
  const { confidence: confidenceValue, shouldSilentRename: aiSilentRename } =
    getAutoApplyBehavior(proposal.confidenceScore);
  const shouldSilentApply =
    proposal.source === 'metadata' ||
    (proposal.source === 'ai' && aiSilentRename);

  if (shouldSilentApply) {
    // Delegate to silent rename handler
    await applySilentRename({
      proposal,
      historyItem: effectiveHistoryItem,
      downloadId,
      settings,
      tracking,
      sourceLabel,
      confidenceValue,
    });
  } else {
    // Delegate to toast queueing handler
    await queueUpgradeToast(
      {
        proposal,
        historyItem: effectiveHistoryItem,
        downloadId,
        settings,
        tracking,
        sourceLabel,
        confidenceValue,
      },
      deps,
    );
  }

  return effectiveHistoryItem;
}
