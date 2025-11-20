/**
 * Handles upgrade proposal processing and application
 * Manages both silent and confirmation-based upgrade flows
 */

import {
  getAutoApplyBehavior,
  SILENT_RENAME_THRESHOLD,
} from '@/entrypoints/shared/constants/confidence-thresholds';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { updateHistoryItem } from '@/entrypoints/shared/history/history';
import type {
  HistoryItem,
  UpgradeProposal,
} from '@/entrypoints/shared/history/types';
import { sendShowRenameToast } from '@/entrypoints/shared/messaging/core-messages';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import { randomId } from '@/entrypoints/shared/utils/id';
import type { DownloadTrackingEntry } from '../download-tracking';
import { executeApply } from '../rename-orchestrator';
import type {
  ConfirmToastController,
  ConfirmToastEntry,
} from '../toast/confirmation-controller';

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
  const { confirmToastController } = deps;
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
    const logLabel =
      proposal.source === 'metadata'
        ? '[UpgradeCoordinator] Applying metadata rename silently'
        : '[UpgradeCoordinator] Applying high-confidence rename silently';
    debugLogger.log(`${logLabel}${sourceLabel}`, {
      historyId,
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
        historyId: effectiveHistoryItem.id,
        downloadId: String(downloadId),
        originalFilename: effectiveHistoryItem.final,
        proposedFilename: proposal.proposedFilename,
        proposedPath: proposal.proposedPath,
        displayProposedPath: proposal.proposedPath,
        fileType: effectiveHistoryItem.fileType,
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
      historyId: effectiveHistoryItem.id,
      autoApplyRemainingMs: null,
    };

    try {
      let renameSuccessful = false;
      await executeApply(
        entry,
        {
          toastId,
          historyId: effectiveHistoryItem.id,
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
              originalFilename: effectiveHistoryItem.final,
              finalFilename: proposal.proposedFilename,
              downloadId: String(downloadId),
              durationMs: 0,
            },
          },
          tracking.tabId,
        );
      }

      debugLogger.log(`${logLabel} completed${sourceLabel}`, {
        historyId,
        downloadId,
      });
    } catch (error) {
      debugLogger.error(`${logLabel} failed${sourceLabel}`, {
        historyId,
        downloadId,
        error,
      });
    }
  } else {
    // Lower confidence or non-AI: Show confirmation toast with countdown
    const autoApplyDelaySeconds = proposal.autoApply
      ? settings.confirmToast.autoApplyDelaySeconds
      : null;

    try {
      await confirmToastController.queueConfirmation({
        historyId: effectiveHistoryItem.id,
        downloadId: String(downloadId),
        originalFilename: effectiveHistoryItem.final,
        proposedFilename: proposal.proposedFilename,
        proposedPath: proposal.proposedPath,
        displayProposedPath: proposal.proposedPath,
        fileType: effectiveHistoryItem.fileType,
        mode: settings.mode,
        reasonTags: proposal.reasonTags ?? ['contextual-upgrade'],
        sensitiveReasons: [],
        sensitiveMatches: [],
        triggerSources: ['contextual-upgrade'],
        autoApplyDelaySeconds,
        allowAlwaysApply: settings.mode !== 'careful',
        target: tracking?.tabId,
      });

      debugLogger.log(
        `[UpgradeCoordinator] Upgrade toast queued${sourceLabel}`,
        {
          historyId,
          downloadId,
          source: proposal.source,
          confidenceScore: confidenceValue,
        },
      );
    } catch (error) {
      debugLogger.error(
        `[UpgradeCoordinator] Queue confirmation failed${sourceLabel}`,
        {
          historyId,
          downloadId,
          error,
        },
      );
    }
  }

  return effectiveHistoryItem;
}
