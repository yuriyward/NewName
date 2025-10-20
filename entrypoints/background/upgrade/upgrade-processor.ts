/**
 * Upgrade analysis processor
 * Handles the core upgrade analysis workflow:
 * - Duplicate prevention
 * - Download resolution
 * - Analysis execution
 * - Proposal normalization
 *
 * Does NOT handle: history updates, toast queueing (those belong to coordinator)
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type {
  HistoryItem,
  UpgradeProposal,
} from '@/entrypoints/shared/history/types';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import { requestMockUpgradeAnalysis } from './mock-analysis';
import { normalizeProposal, resolveDownloadItem } from './normalization';
import type { BrowserDownloadItem, UpgradeAnalysisInput } from './types';

export interface ProcessUpgradeAnalysisParams {
  historyId: string;
  downloadId: number;
  settings: Settings;
  now: number;
  historyItem: HistoryItem;
}

export interface UpgradeProcessor {
  processAnalysis(
    params: ProcessUpgradeAnalysisParams,
  ): Promise<UpgradeProposal | null>;
}

export interface UpgradeProcessorDependencies {
  requestAnalysis?: (
    input: UpgradeAnalysisInput,
  ) => Promise<UpgradeProposal | null>;
}

export function createUpgradeProcessor(
  deps: UpgradeProcessorDependencies,
): UpgradeProcessor {
  const { requestAnalysis } = deps;

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
      // Fall back to mock analysis if no real analysis available
      return await requestMockUpgradeAnalysis(analysisInput);
    } catch (error) {
      debugLogger.error('[UpgradeProcessor] Upgrade analysis failed', {
        historyId: historyItem.id,
        downloadId,
        error,
      });
      return null;
    }
  }

  async function processAnalysis({
    historyId,
    downloadId,
    settings,
    now,
    historyItem,
  }: ProcessUpgradeAnalysisParams): Promise<UpgradeProposal | null> {
    // Prevent duplicate analysis from both scheduler alarms and downloads.onChanged
    if (inFlightAnalyses.has(historyId)) {
      debugLogger.log(
        '[UpgradeProcessor] Duplicate analysis prevented for history item',
        {
          historyId,
          downloadId,
          source: 'processor-duplicate-guard',
        },
      );
      return null;
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
            '[UpgradeProcessor] Download item missing during analysis',
            context,
          );
        } else if (resolution.reason === 'permission-denied') {
          debugLogger.warn(
            '[UpgradeProcessor] Missing permission for download analysis',
            {
              ...context,
              error: resolution.error,
            },
          );
        } else if (resolution.reason === 'invalid-payload') {
          debugLogger.error(
            '[UpgradeProcessor] Download item payload invalid',
            {
              ...context,
              error: resolution.error,
            },
          );
        } else {
          debugLogger.error(
            '[UpgradeProcessor] Unexpected failure resolving download item',
            {
              ...context,
              error: resolution.error,
            },
          );
        }

        return null;
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
        return null;
      }

      // Normalize the proposal for storage and display
      const normalizedProposal = normalizeProposal(proposal, now);
      return normalizedProposal;
    } finally {
      // Remove from in-flight when complete (success or error)
      inFlightAnalyses.delete(historyId);
    }
  }

  return {
    processAnalysis,
  };
}
