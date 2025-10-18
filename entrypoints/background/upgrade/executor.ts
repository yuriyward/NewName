import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { updateHistoryItem } from '@/entrypoints/shared/history/history';
import type {
  HistoryItem,
  UpgradeProposal,
} from '@/entrypoints/shared/history/types';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import type { ConfirmToastController } from '../toast/confirmation-controller';
import { requestMockUpgradeAnalysis } from './mock-analysis';
import { normalizeProposal, resolveDownloadItem } from './normalization';
import type { BrowserDownloadItem, UpgradeAnalysisInput } from './types';

export interface ProcessUpgradeAnalysisParams {
  historyId: string;
  downloadId: number;
  settings: Settings;
  now: number;
  historyItem: HistoryItem;
  tabId?: number;
}

export interface UpgradeExecutor {
  processAnalysis(params: ProcessUpgradeAnalysisParams): Promise<void>;
}

export interface UpgradeExecutorDependencies {
  confirmToastController: ConfirmToastController;
  requestAnalysis?: (
    input: UpgradeAnalysisInput,
  ) => Promise<UpgradeProposal | null>;
}

export function createUpgradeExecutor(
  deps: UpgradeExecutorDependencies,
): UpgradeExecutor {
  const { confirmToastController, requestAnalysis } = deps;

  // Track in-flight analyses to prevent duplicates from multiple entry points
  // (both downloads.onChanged and scheduler alarms can trigger analysis)
  const inFlightAnalyses = new Set<string>();

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
      debugLogger.error('[UpgradeExecutor] Upgrade analysis failed', {
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
    tabId?: number,
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
        target: tabId,
      });

      debugLogger.log('[UpgradeExecutor] Upgrade toast queued', {
        historyId: historyItem.id,
        downloadId,
        source: proposal.source,
        confidence: proposal.confidence,
      });
    } catch (error) {
      debugLogger.error('[UpgradeExecutor] Queue confirmation failed', {
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
    tabId,
  }: ProcessUpgradeAnalysisParams): Promise<void> {
    // Prevent duplicate analysis from both scheduler alarms and downloads.onChanged
    if (inFlightAnalyses.has(historyId)) {
      debugLogger.log(
        '[UpgradeExecutor] Duplicate analysis prevented for history item',
        {
          historyId,
          downloadId,
          source: 'executor-duplicate-guard',
        },
      );
      return;
    }

    // Mark as in-flight immediately to guard against both entry points
    inFlightAnalyses.add(historyId);

    try {
      const resolution = await resolveDownloadItem(downloadId, {
        historyId,
        historyPath: historyItem.path,
        historyPhase: historyItem.phase,
        historySource: historyItem.source,
        pendingReason: historyItem.pendingUpgradeAnalysis?.reason,
      });
      if (resolution.status !== 'success') {
        const context = {
          historyId,
          downloadId,
          reason: resolution.reason,
        };

        if (resolution.reason === 'not-found') {
          debugLogger.warn(
            '[UpgradeExecutor] Download item missing during analysis',
            context,
          );
        } else if (resolution.reason === 'permission-denied') {
          debugLogger.warn(
            '[UpgradeExecutor] Missing permission for download analysis',
            {
              ...context,
              error: resolution.error,
            },
          );
        } else if (resolution.reason === 'invalid-payload') {
          debugLogger.error('[UpgradeExecutor] Download item payload invalid', {
            ...context,
            error: resolution.error,
          });
        } else {
          debugLogger.error(
            '[UpgradeExecutor] Unexpected failure resolving download item',
            {
              ...context,
              error: resolution.error,
            },
          );
        }

        return;
      }

      const downloadItem = resolution.downloadItem;
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
          '[UpgradeExecutor] Failed to persist upgrade proposal',
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
        tabId,
      );
    } finally {
      // Remove from in-flight when complete (success or error)
      inFlightAnalyses.delete(historyId);
    }
  }

  return {
    processAnalysis,
  };
}
