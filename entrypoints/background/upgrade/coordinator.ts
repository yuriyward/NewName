/**
 * Contextual upgrade coordinator for completed downloads
 * Owns the complete upgrade workflow:
 * - Entry point for download completion events and scheduled analyses
 * - Eligibility checking
 * - Delegates analysis to processor
 * - Updates history and displays results
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { getHistoryItem } from '@/entrypoints/shared/history/history';
import type { DownloadTrackingEntry } from '../download-tracking';
import {
  type ApplyMetadataUpgradeParams,
  applyMetadataUpgrade,
} from './applyMetadataUpgrade';
import { shouldAnalyzeUpgrade } from './eligibility';
import { handleUpgradeProposal } from './handleUpgradeProposal';
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
  applyMetadataUpgrade(params: ApplyMetadataUpgradeParams): Promise<void>;
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

      const settings = readSettings();

      await handleUpgradeProposal(
        {
          proposal,
          historyId: analysisParams.historyId,
          historyItem: analysisParams.historyItem,
          downloadId: analysisParams.downloadId,
          settings,
          source: 'scheduler',
        },
        { confirmToastController },
      );
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

      if (!shouldAnalyzeUpgrade(historyItem, settings, now, 'immediate')) {
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

      historyItem = await handleUpgradeProposal(
        {
          proposal,
          historyId,
          historyItem,
          downloadId: delta.id,
          settings,
          tracking,
          source: 'downloads-onChanged',
        },
        { confirmToastController },
      );
    },
    scheduleMockAnalysis: scheduler.scheduleMockAnalysis,
    handleAlarm: scheduler.handleAlarm,
    cleanupOrphanedAlarms: scheduler.cleanupOrphanedAlarms,
    async applyMetadataUpgrade(params: ApplyMetadataUpgradeParams) {
      await applyMetadataUpgrade(params, {
        confirmToastController,
        readSettings,
      });
    },
  };
}
