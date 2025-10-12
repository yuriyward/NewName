/**
 * Contextual upgrade coordinator for completed downloads
 */
import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  getHistoryItem,
  updateHistoryItem,
} from '@/entrypoints/shared/history/history';
import type {
  HistoryItem,
  UpgradeProposal,
} from '@/entrypoints/shared/history/types';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import type { DownloadTrackingEntry } from '../download-tracking';
import { shouldAnalyzeUpgrade } from './eligibility';
import { requestMockUpgradeAnalysis } from './mock-analysis';
import type {
  BrowserDownloadDelta,
  BrowserDownloadItem,
  ScheduleUpgradeAnalysisParams,
  UpgradeAnalysisInput,
  UpgradeCoordinatorParams,
} from './types';

type AlarmCallback = Parameters<typeof browser.alarms.onAlarm.addListener>[0];
type BrowserAlarm = Parameters<AlarmCallback>[0];

export interface UpgradeCoordinator {
  handleDownloadChange(
    delta: BrowserDownloadDelta,
    tracking: DownloadTrackingEntry | undefined,
  ): Promise<void>;
  scheduleMockAnalysis(params: ScheduleUpgradeAnalysisParams): Promise<void>;
  handleAlarm(alarm: BrowserAlarm): Promise<boolean>;
}

function normaliseDownloadItem(item: unknown): BrowserDownloadItem {
  const source = item as Partial<BrowserDownloadItem>;
  return {
    id: source.id,
    filename: source.filename,
    totalBytes: source.totalBytes,
    bytesReceived: source.bytesReceived ?? 0,
    state: source.state,
    url: source.url,
  };
}

function normalizeProposal(
  proposal: UpgradeProposal,
  now: number,
): UpgradeProposal {
  return {
    proposedFilename: proposal.proposedFilename,
    proposedPath: proposal.proposedPath,
    confidence: proposal.confidence,
    autoApply: proposal.autoApply ?? false,
    reasonTags: proposal.reasonTags ?? [],
    generatedAt: proposal.generatedAt ?? now,
    source: proposal.source ?? 'ai',
    summary: proposal.summary,
  };
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

  const MOCK_ALARM_PREFIX = 'mock-upgrade-';
  const MOCK_ANALYSIS_DELAY_MS = 5_000;

  async function resolveDownloadItem(
    downloadId: number,
  ): Promise<BrowserDownloadItem | null> {
    try {
      const [item] = await browser.downloads.search({ id: downloadId });
      if (!item) {
        return null;
      }
      return normaliseDownloadItem(item);
    } catch (error) {
      debugLogger.warn('[UpgradeCoordinator] Failed to resolve download item', {
        downloadId,
        error,
      });
      return null;
    }
  }

  async function runAnalysis(
    downloadId: number,
    historyItem: HistoryItem,
    downloadItem: BrowserDownloadItem,
    settings: Settings,
    now: number,
  ): Promise<UpgradeProposal | null> {
    const analysisInput: UpgradeAnalysisInput = {
      downloadId,
      downloadItem,
      historyItem,
      settings,
      now,
    };

    try {
      if (requestAnalysis) {
        return await requestAnalysis(analysisInput);
      }
      return await requestMockUpgradeAnalysis(analysisInput);
    } catch (error) {
      debugLogger.error('[UpgradeCoordinator] Upgrade analysis failed', {
        historyId: historyItem.id,
        downloadId,
        error,
      });
      return null;
    }
  }

  async function queueUpgradeToast(
    historyItem: HistoryItem,
    proposal: UpgradeProposal,
    settings: Settings,
    downloadId: number,
  ): Promise<void> {
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
      });

      debugLogger.log('[UpgradeCoordinator] Upgrade toast queued', {
        historyId: historyItem.id,
        downloadId,
        source: proposal.source,
        confidence: proposal.confidence,
      });
    } catch (error) {
      debugLogger.error('[UpgradeCoordinator] Queue confirmation failed', {
        historyId: historyItem.id,
        downloadId,
        error,
      });
    }
  }

  async function processAnalysis({
    historyId,
    downloadId,
    settings,
    now,
    historyItem,
  }: {
    historyId: string;
    downloadId: number;
    settings: Settings;
    now: number;
    historyItem: HistoryItem;
  }): Promise<void> {
    const downloadItem = await resolveDownloadItem(downloadId);
    if (!downloadItem) {
      return;
    }

    const proposal = await runAnalysis(
      downloadId,
      historyItem,
      downloadItem,
      settings,
      now,
    );
    if (!proposal) {
      return;
    }

    const normalizedProposal = normalizeProposal(proposal, now);

    try {
      const updated = await updateHistoryItem(historyId, (item) => ({
        ...item,
        pendingUpgradeAnalysis: undefined,
        upgrade: normalizedProposal,
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

    await queueUpgradeToast(
      historyItem,
      normalizedProposal,
      settings,
      downloadId,
    );
  }

  async function scheduleMockAnalysis({
    historyId,
    downloadId,
    fileType,
  }: ScheduleUpgradeAnalysisParams): Promise<void> {
    if (fileType !== 'pdf') {
      return;
    }
    if (downloadId === undefined) {
      debugLogger.warn(
        '[UpgradeCoordinator] Cannot schedule mock analysis without download id',
        { historyId },
      );
      return;
    }

    const now = nowFn();
    try {
      const updated = await updateHistoryItem(historyId, (item) => ({
        ...item,
        pendingUpgradeAnalysis: {
          downloadId,
          scheduledAt: now,
          reason: 'mock-delayed-upgrade',
        },
      }));

      if (!updated) {
        debugLogger.warn(
          '[UpgradeCoordinator] Failed to store pending mock analysis',
          { historyId },
        );
        return;
      }

      const alarmName = `${MOCK_ALARM_PREFIX}${historyId}`;
      await browser.alarms.create(alarmName, {
        delayInMinutes: MOCK_ANALYSIS_DELAY_MS / 60_000,
      });

      debugLogger.log('[UpgradeCoordinator] Mock analysis scheduled', {
        historyId,
        downloadId,
        alarmName,
      });
    } catch (error) {
      debugLogger.error(
        '[UpgradeCoordinator] Failed to schedule mock upgrade analysis',
        { historyId, error },
      );
    }
  }

  async function handleAlarm(alarm: BrowserAlarm): Promise<boolean> {
    if (!alarm.name.startsWith(MOCK_ALARM_PREFIX)) {
      return false;
    }
    const historyId = alarm.name.slice(MOCK_ALARM_PREFIX.length);
    const now = nowFn();
    const settings = readSettings();

    const historyItem = await getHistoryItem(historyId);
    if (!historyItem) {
      debugLogger.warn('[UpgradeCoordinator] Alarm fired for missing history', {
        historyId,
      });
      return true;
    }

    const pending = historyItem.pendingUpgradeAnalysis;
    if (!pending) {
      debugLogger.log(
        '[UpgradeCoordinator] No pending upgrade analysis for alarm',
        historyId,
      );
      return true;
    }

    const downloadId = pending.downloadId;

    await processAnalysis({
      historyId,
      downloadId,
      settings,
      now,
      historyItem,
    });

    return true;
  }

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
        return;
      }

      await processAnalysis({
        historyId,
        downloadId: delta.id,
        settings,
        now,
        historyItem,
      });
    },
    scheduleMockAnalysis,
    handleAlarm,
  };
}
