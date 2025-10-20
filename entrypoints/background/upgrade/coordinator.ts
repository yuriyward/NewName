/**
 * Contextual upgrade coordinator for completed downloads
 * Owns the complete upgrade workflow:
 * - Entry point for download completion events and scheduled analyses
 * - Eligibility checking
 * - Delegates analysis to processor
 * - Updates history and displays results
 */
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  getHistoryItem,
  updateHistoryItem,
} from '@/entrypoints/shared/history/history';
import type { DownloadTrackingEntry } from '../download-tracking';
import { shouldAnalyzeUpgrade } from './eligibility';
import { type BrowserAlarm, createUpgradeScheduler } from './scheduler';
import type {
  BrowserDownloadDelta,
  ScheduleUpgradeAnalysisParams,
  UpgradeCoordinatorParams,
} from './types';
import { createUpgradeProcessor } from './upgrade-processor';

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

  const scheduler = createUpgradeScheduler({
    now: nowFn,
    readSettings,
    processAnalysis: async (analysisParams) => {
      const proposal = await processor.processAnalysis(analysisParams);

      if (!proposal) {
        return;
      }

      // Update history with the proposal
      try {
        await updateHistoryItem(analysisParams.historyId, (item) => ({
          ...item,
          pendingUpgradeAnalysis: undefined,
          upgrade: proposal,
        }));
      } catch (error) {
        debugLogger.warn(
          '[UpgradeCoordinator] Failed to persist upgrade proposal from scheduler',
          {
            historyId: analysisParams.historyId,
            error,
          },
        );
      }

      // Queue the confirmation toast for user action
      const autoApplyDelaySeconds = proposal.autoApply
        ? readSettings().confirmToast.autoApplyDelaySeconds
        : null;

      try {
        await confirmToastController.queueConfirmation({
          historyId: analysisParams.historyItem.id,
          downloadId: String(analysisParams.downloadId),
          originalFilename: analysisParams.historyItem.final,
          proposedFilename: proposal.proposedFilename,
          proposedPath: proposal.proposedPath,
          displayProposedPath: proposal.proposedPath,
          fileType: analysisParams.historyItem.fileType,
          mode: readSettings().mode,
          reasonTags: proposal.reasonTags ?? ['contextual-upgrade'],
          sensitiveReasons: [],
          sensitiveMatches: [],
          triggerSources: ['contextual-upgrade'],
          autoApplyDelaySeconds,
          allowAlwaysApply: readSettings().mode !== 'careful',
        });

        debugLogger.log(
          '[UpgradeCoordinator] Upgrade toast queued from scheduler',
          {
            historyId: analysisParams.historyId,
            downloadId: analysisParams.downloadId,
            source: proposal.source,
            confidence: proposal.confidence,
          },
        );
      } catch (error) {
        debugLogger.error(
          '[UpgradeCoordinator] Queue confirmation failed from scheduler',
          {
            historyId: analysisParams.historyId,
            downloadId: analysisParams.downloadId,
            error,
          },
        );
      }
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

      // Update history with the proposal
      try {
        const updated = await updateHistoryItem(historyId, (item) => ({
          ...item,
          pendingUpgradeAnalysis: undefined,
          upgrade: proposal,
        }));
        if (updated) {
          historyItem = updated;
        }
      } catch (error) {
        debugLogger.warn(
          '[UpgradeCoordinator] Failed to persist upgrade proposal',
          {
            historyId,
            error,
          },
        );
      }

      // Queue the confirmation toast for user action
      const autoApplyDelaySeconds = proposal.autoApply
        ? settings.confirmToast.autoApplyDelaySeconds
        : null;

      try {
        await confirmToastController.queueConfirmation({
          historyId: historyItem.id,
          downloadId: String(delta.id),
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
          target: tracking.tabId,
        });

        debugLogger.log('[UpgradeCoordinator] Upgrade toast queued', {
          historyId,
          downloadId: delta.id,
          source: proposal.source,
          confidence: proposal.confidence,
        });
      } catch (error) {
        debugLogger.error('[UpgradeCoordinator] Queue confirmation failed', {
          historyId,
          downloadId: delta.id,
          error,
        });
      }
    },
    scheduleMockAnalysis: scheduler.scheduleMockAnalysis,
    handleAlarm: scheduler.handleAlarm,
    cleanupOrphanedAlarms: scheduler.cleanupOrphanedAlarms,
  };
}
