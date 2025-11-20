/**
 * Post-download actions for history recording and media analysis
 */
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { addHistoryItem } from '@/entrypoints/shared/history/history';
import { logMediaDebug } from '@/entrypoints/shared/integrations/mediainfo/debug';
import { enqueueMediaAnalysis } from '@/entrypoints/shared/integrations/mediainfo/media-analysis-queue';
import type {
  MediaAnalysisRequest,
  MediaAnalysisResponse,
} from '@/entrypoints/shared/integrations/mediainfo/messages';
import type {
  InstantBaselineEvaluation,
  InstantBaselineStrategy,
} from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import { randomId } from '@/entrypoints/shared/utils/id';
import type { DownloadPlan } from './download-plan';
import type { DownloadTrackingEntry } from './download-tracking';
import { recordDownloadTracking } from './download-tracking';
import { isMediaFileType } from './download-utils';
import { applyMediaAnalysisResponse } from './media-orchestrator';
import type { ScheduleUpgradeAnalysisParams } from './upgrade/types';

interface PostActionsOptions {
  plan: DownloadPlan;
  evaluation: InstantBaselineEvaluation;
  renameCandidate: InstantBaselineEvaluation['rename'] | undefined;
  typeEnabled: boolean;
  finalFilename: string;
  renameRelativePath: string;
  originalRelativePath: string;
  downloadTracking: Map<number, DownloadTrackingEntry>;
  readSettings: () => Settings;
  scheduleUpgradeAnalysis: (
    params: ScheduleUpgradeAnalysisParams,
  ) => Promise<void>;
  applyMetadataUpgrade: (params: {
    historyId: string;
    downloadId?: number;
    resolveTracking?: () => DownloadTrackingEntry | undefined;
  }) => Promise<void>;
  prefetchedMedia?: {
    request: MediaAnalysisRequest;
    response: MediaAnalysisResponse;
  };
}

function strategyNeedsUpgrade(strategy: InstantBaselineStrategy): boolean {
  // Only the keep-original strategy opts out of contextual upgrades; the upgrade
  // coordinator runs deeper eligibility checks once it loads the history item.
  return strategy !== 'keep-original';
}

export async function applyPostDownloadActions({
  plan,
  evaluation,
  renameCandidate,
  typeEnabled,
  finalFilename,
  renameRelativePath,
  originalRelativePath,
  downloadTracking,
  readSettings,
  scheduleUpgradeAnalysis,
  applyMetadataUpgrade,
  prefetchedMedia,
}: PostActionsOptions): Promise<void> {
  // Helper to resolve download tracking for metadata upgrades
  const resolveTracking = (): DownloadTrackingEntry | undefined => {
    if (plan.rawDownloadId === undefined) {
      return undefined;
    }
    return downloadTracking.get(plan.rawDownloadId);
  };

  const historyDecision: InstantBaselineEvaluation['decision'] = renameCandidate
    ? evaluation.decision
    : {
        ...evaluation.decision,
        outcome: 'keep',
        reasons:
          evaluation.decision.outcome === 'rename' && !typeEnabled
            ? [...evaluation.decision.reasons, 'file-type-disabled']
            : evaluation.decision.reasons,
      };

  await addHistoryItem({
    id: plan.historyId,
    ts: Date.now(),
    path: renameCandidate ? renameRelativePath : originalRelativePath,
    original: plan.filename,
    final: finalFilename,
    source: renameCandidate ? renameCandidate.source : evaluation.source,
    fileType: evaluation.fileType,
    phase: 'instant-baseline',
    reasonTags: evaluation.reasonTags,
    downloadId: plan.rawDownloadId,
    decision: historyDecision,
    pageContext: plan.pageContext
      ? {
          title: plan.pageContext.title,
          heading: plan.pageContext.heading,
          url: plan.pageContext.url,
        }
      : undefined,
  });

  if (plan.rawDownloadId !== undefined) {
    recordDownloadTracking(downloadTracking, plan.rawDownloadId, {
      historyId: plan.historyId,
      debug: plan.debugSettings,
      url: plan.url,
      filename: finalFilename,
      createdAt: Date.now(),
      tabId: plan.initiatingTabId,
    });
  }

  if (plan.debugContext) {
    const evaluationForDebug = renameCandidate
      ? evaluation
      : {
          ...evaluation,
          decision: historyDecision,
        };
    debugLogger.finishContext(plan.debugContext.downloadId, {
      evaluation: evaluationForDebug,
    });
  }

  // Skip contextual (AI) upgrades for media files - they only use MediaInfo metadata upgrades
  if (
    strategyNeedsUpgrade(evaluation.strategy) &&
    !isMediaFileType(evaluation.fileType)
  ) {
    debugLogger.log('[DownloadPostActions] Scheduling contextual upgrade', {
      historyId: plan.historyId,
      strategy: evaluation.strategy,
      fileType: evaluation.fileType,
      hasDownloadId: plan.rawDownloadId !== undefined,
    });

    void scheduleUpgradeAnalysis({
      historyId: plan.historyId,
      downloadId: plan.rawDownloadId,
      fileType: evaluation.fileType,
    }).catch((error) => {
      debugLogger.error(
        '[DownloadCoordinator] Upgrade analysis scheduling failed',
        {
          historyId: plan.historyId,
          error,
        },
      );
    });
  }

  if (prefetchedMedia) {
    void (async () => {
      try {
        const upgradeGenerated = await applyMediaAnalysisResponse(
          plan.historyId,
          plan.url,
          prefetchedMedia.request.requestId,
          plan.debugSettings,
          prefetchedMedia.response,
          plan.downloadId,
          readSettings,
        );
        if (upgradeGenerated) {
          await applyMetadataUpgrade({
            historyId: plan.historyId,
            downloadId: plan.rawDownloadId,
            resolveTracking,
          });
        }
      } catch (error) {
        debugLogger.error(
          '[DownloadPostActions] Prefetched media application failed',
          {
            historyId: plan.historyId,
            error,
          },
        );
      }
    })();
    return;
  }

  if (
    isMediaFileType(evaluation.fileType) &&
    plan.url &&
    plan.settings.metadataToggles.mediaSpecs &&
    typeEnabled &&
    !plan.url.startsWith('data:')
  ) {
    const mediaRequest: MediaAnalysisRequest = {
      requestId: randomId(),
      historyId: plan.historyId,
      downloadId: plan.downloadId,
      url: plan.url,
      originalFilename: finalFilename,
      fileType: evaluation.fileType,
      debug: plan.debugSettings,
    };

    logMediaDebug(plan.debugSettings, 'queue-request', {
      requestId: mediaRequest.requestId,
      historyId: plan.historyId,
      url: plan.url,
    });

    void enqueueMediaAnalysis(mediaRequest)
      .then(async (response) => {
        logMediaDebug(plan.debugSettings, 'queue-response', {
          requestId: mediaRequest.requestId,
          status: response.status,
        });
        const upgradeGenerated = await applyMediaAnalysisResponse(
          plan.historyId,
          plan.url,
          mediaRequest.requestId,
          plan.debugSettings,
          response,
          plan.downloadId,
          readSettings,
        );
        if (upgradeGenerated) {
          await applyMetadataUpgrade({
            historyId: plan.historyId,
            downloadId: plan.rawDownloadId,
            resolveTracking,
          });
        }
      })
      .catch((error: unknown) => {
        logMediaDebug(plan.debugSettings, 'queue-failure', {
          requestId: mediaRequest.requestId,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown media analysis error',
        });
      });
  }
}
