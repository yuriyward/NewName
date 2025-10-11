import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { addHistoryItem } from '@/entrypoints/shared/history/history';
import { logMediaDebug } from '@/entrypoints/shared/integrations/mediainfo/debug';
import { enqueueMediaAnalysis } from '@/entrypoints/shared/integrations/mediainfo/media-analysis-queue';
import type { MediaAnalysisRequest } from '@/entrypoints/shared/integrations/mediainfo/messages';
import type { InstantBaselineEvaluation } from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import { randomId } from '@/entrypoints/shared/utils/id';
import type { DownloadPlan } from './download-plan';
import type { DownloadTrackingEntry } from './download-tracking';
import { recordDownloadTracking } from './download-tracking';
import { isMediaFileType } from './download-utils';
import { applyMediaAnalysisResponse } from './media-orchestrator';

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
}: PostActionsOptions): Promise<void> {
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
    decision: historyDecision,
  });

  if (plan.rawDownloadId !== undefined) {
    recordDownloadTracking(downloadTracking, plan.rawDownloadId, {
      historyId: plan.historyId,
      debug: plan.debugSettings,
      url: plan.url,
      filename: finalFilename,
      createdAt: Date.now(),
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

  if (
    evaluation.fileType === 'pdf' &&
    renameCandidate &&
    plan.confirmRoute.kind !== 'toast'
  ) {
    void schedulePdfAnalysisSafely({
      historyId: plan.historyId,
      currentPath: renameRelativePath,
      currentFilename: finalFilename,
      fileType: evaluation.fileType,
    });
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
      .then((response) => {
        logMediaDebug(plan.debugSettings, 'queue-response', {
          requestId: mediaRequest.requestId,
          status: response.status,
        });
        return applyMediaAnalysisResponse(
          plan.historyId,
          plan.url,
          mediaRequest.requestId,
          plan.debugSettings,
          response,
          plan.downloadId,
          readSettings,
        );
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

async function schedulePdfAnalysisSafely(params: {
  historyId: string;
  currentPath: string;
  currentFilename: string;
  fileType: InstantBaselineEvaluation['fileType'];
}): Promise<void> {
  try {
    const { schedulePdfAnalysisForDownload } = await import(
      './rename-orchestrator'
    );
    await schedulePdfAnalysisForDownload({
      historyId: params.historyId,
      currentPath: params.currentPath,
      currentFilename: params.currentFilename,
      fileType: params.fileType,
    });
  } catch (error) {
    debugLogger.error('[DownloadCoordinator] PDF analysis scheduling failed', {
      historyId: params.historyId,
      error,
    });
  }
}
