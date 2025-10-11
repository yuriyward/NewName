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
  UpgradeAnalysisInput,
  UpgradeCoordinatorParams,
} from './types';

export interface UpgradeCoordinator {
  handleDownloadChange(
    delta: BrowserDownloadDelta,
    tracking: DownloadTrackingEntry | undefined,
  ): Promise<void>;
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
        return;
      }

      const downloadItem = await resolveDownloadItem(delta.id);
      if (!downloadItem) {
        return;
      }

      const proposal = await runAnalysis(
        delta.id,
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
        delta.id,
      );
    },
  };
}
