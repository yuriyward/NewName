/**
 * Contextual upgrade coordinator for completed downloads
 */
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { getHistoryItem } from '@/entrypoints/shared/history/history';
import type { DownloadTrackingEntry } from '../download-tracking';
import { shouldAnalyzeUpgrade } from './eligibility';
import { createUpgradeExecutor } from './executor';
import { type BrowserAlarm, createUpgradeScheduler } from './scheduler';
import type {
  BrowserDownloadDelta,
  ScheduleUpgradeAnalysisParams,
  UpgradeCoordinatorParams,
} from './types';

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

  const executor = createUpgradeExecutor({
    confirmToastController,
    requestAnalysis,
  });

  const scheduler = createUpgradeScheduler({
    now: nowFn,
    readSettings,
    processAnalysis: executor.processAnalysis,
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

      const historyItem = await getHistoryItem(historyId);
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

      // The executor will handle duplicate prevention for analyses triggered
      // from both downloads.onChanged and scheduler alarms
      await executor.processAnalysis({
        historyId,
        downloadId: delta.id,
        settings,
        now,
        historyItem,
        tabId: tracking.tabId,
      });
    },
    scheduleMockAnalysis: scheduler.scheduleMockAnalysis,
    handleAlarm: scheduler.handleAlarm,
    cleanupOrphanedAlarms: scheduler.cleanupOrphanedAlarms,
  };
}
