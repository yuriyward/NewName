/**
 * Contextual upgrade coordinator for completed downloads
 * Owns the complete upgrade workflow:
 * - Entry point for download completion events and scheduled analyses
 * - Eligibility checking
 * - Delegates analysis to processor
 * - Updates history and displays results
 */

import {
  SILENT_RENAME_THRESHOLD,
  getAutoApplyBehavior,
} from '@/entrypoints/shared/constants/confidence-thresholds';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  getHistoryItem,
  updateHistoryItem,
} from '@/entrypoints/shared/history/history';
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
import { shouldAnalyzeUpgrade } from './eligibility';
import { type BrowserAlarm, createUpgradeScheduler } from './scheduler';
import type {
  BrowserDownloadDelta,
  ScheduleUpgradeAnalysisParams,
  UpgradeCoordinatorParams,
} from './types';
import { createUpgradeProcessor } from './upgrade-processor';

type UpgradeProposalSourceContext = 'downloads-onChanged' | 'scheduler';

interface HandleUpgradeProposalParams {
  proposal: UpgradeProposal;
  historyId: string;
  historyItem: HistoryItem;
  downloadId: number;
  settings: Settings;
  tracking?: DownloadTrackingEntry;
  source: UpgradeProposalSourceContext;
}

export interface UpgradeCoordinator {
  handleDownloadChange(
    delta: BrowserDownloadDelta,
    tracking: DownloadTrackingEntry | undefined,
  ): Promise<void>;
  scheduleMockAnalysis(params: ScheduleUpgradeAnalysisParams): Promise<void>;
  handleAlarm(alarm: BrowserAlarm): Promise<boolean>;
  cleanupOrphanedAlarms(): Promise<void>;
}

export function createUpgradeCoordinator(
  params: UpgradeCoordinatorParams,
): UpgradeCoordinator {
  const {
    confirmToastController,
    readSettings,
    requestAnalysis,
    now: nowFn = () => Date.now(),
  } = params;

  const processor = createUpgradeProcessor({
    requestAnalysis,
  });

  async function handleUpgradeProposal({
    proposal,
    historyId,
    historyItem,
    downloadId,
    settings,
    tracking,
    source,
  }: HandleUpgradeProposalParams): Promise<HistoryItem> {
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
    const { confidence: confidenceValue, shouldSilentRename } =
      getAutoApplyBehavior(proposal.confidenceScore);

    if (shouldSilentRename && proposal.source === 'ai') {
      // High confidence: Apply immediately without confirmation
      debugLogger.log(
        `[UpgradeCoordinator] Applying high-confidence rename silently${sourceLabel}`,
        {
          historyId,
          downloadId,
          confidence: confidenceValue,
          threshold: SILENT_RENAME_THRESHOLD,
        },
      );

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
              debugLogger.log(
                `[UpgradeCoordinator] Silent rename status${sourceLabel}`,
                {
                  state,
                  message,
                },
              );
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

        debugLogger.log(
          `[UpgradeCoordinator] Silent rename completed${sourceLabel}`,
          {
            historyId,
            downloadId,
          },
        );
      } catch (error) {
        debugLogger.error(
          `[UpgradeCoordinator] Silent rename failed${sourceLabel}`,
          {
            historyId,
            downloadId,
            error,
          },
        );
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

  const scheduler = createUpgradeScheduler({
    now: nowFn,
    readSettings,
    processAnalysis: async (analysisParams) => {
      const proposal = await processor.processAnalysis(analysisParams);

      if (!proposal) {
        return;
      }

      const settings = readSettings();

      await handleUpgradeProposal({
        proposal,
        historyId: analysisParams.historyId,
        historyItem: analysisParams.historyItem,
        downloadId: analysisParams.downloadId,
        settings,
        source: 'scheduler',
      });
    },
  });

  return {
    async handleDownloadChange(delta, tracking) {
      if (!tracking) {
        return;
      }

      const state = delta.state?.current;
      if (state !== 'complete') {
        return;
      }

      const historyId = tracking.historyId;
      const settings = readSettings();
      const now = nowFn();

      let historyItem = await getHistoryItem(historyId);
      if (!historyItem) {
        debugLogger.warn(
          '[UpgradeCoordinator] History item missing for download',
          {
            historyId,
            downloadId: delta.id,
          },
        );
        return;
      }

      if (!shouldAnalyzeUpgrade(historyItem, settings, now)) {
        debugLogger.log(
          '[UpgradeCoordinator] Upgrade analysis skipped (ineligible)',
          {
            historyId,
            downloadId: delta.id,
            reason: 'eligibility-check-failed',
          },
        );
        return;
      }

      debugLogger.log('[UpgradeCoordinator] Starting upgrade analysis', {
        downloadId: delta.id,
        historyId,
        fileType: historyItem.fileType,
      });

      // The processor handles duplicate prevention for analyses triggered
      // from both downloads.onChanged and scheduler alarms
      const proposal = await processor.processAnalysis({
        historyId,
        downloadId: delta.id,
        settings,
        now,
        historyItem,
      });

      if (!proposal) {
        return;
      }

      historyItem = await handleUpgradeProposal({
        proposal,
        historyId,
        historyItem,
        downloadId: delta.id,
        settings,
        tracking,
        source: 'downloads-onChanged',
      });
    },
    scheduleMockAnalysis: scheduler.scheduleMockAnalysis,
    handleAlarm: scheduler.handleAlarm,
    cleanupOrphanedAlarms: scheduler.cleanupOrphanedAlarms,
  };
}
