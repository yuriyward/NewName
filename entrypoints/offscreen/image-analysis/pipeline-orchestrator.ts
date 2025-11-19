/**
 * Image upgrade pipeline orchestrator
 * Coordinates image analysis: ingestion → description → decision → filename generation
 */

import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import type {
  ImageIngestionResult,
  ImageUpgradeAnalysisRequest,
  ImageUpgradeAnalysisResponse,
} from '@/entrypoints/shared/integrations/image-analysis/types';
import {
  buildSessionCreationFailureResponse,
  checkMultimodalAvailability,
} from './model-availability';
import {
  runDecidePhase,
  runDescribePhase,
  runGeneratePhase,
} from './pipeline-phases';
import { buildProposalFromAnalysis } from './proposal-builder';

/**
 * Run the complete image upgrade analysis pipeline
 * Returns upgrade proposal or null if filename should not be changed
 *
 * @param request - Image upgrade analysis request
 * @param ingestion - Ingestion result with PNG blob and metadata
 * @returns Analysis response or null
 */
export async function runImageUpgradePipeline(
  request: ImageUpgradeAnalysisRequest,
  ingestion: ImageIngestionResult,
): Promise<ImageUpgradeAnalysisResponse | null> {
  const startedAt = Date.now();
  const mode = request.settings.mode ?? 'on-device-only';

  if (mode === 'off') {
    return null;
  }

  // Check multimodal Prompt API availability
  const availabilityError = await checkMultimodalAvailability(
    request.requestId,
  );
  if (availabilityError) {
    if (mode === 'on-device-only') {
      return availabilityError;
    }
    return null;
  }

  offscreenLogger.log('[ImageUpgradeAI] Multimodal API ready', {
    requestId: request.requestId,
    imageSize: `${ingestion.originalWidth}x${ingestion.originalHeight}`,
    resizedSize: `${ingestion.resizedWidth}x${ingestion.resizedHeight}`,
  });

  // PHASE 1: Describe Image
  const describeResult = await runDescribePhase(
    ingestion.blob,
    request.requestId,
    request,
  );
  if (!describeResult) {
    return buildSessionCreationFailureResponse(request.requestId);
  }

  // PHASE 2: Rename Decision
  const decideResult = await runDecidePhase(
    request,
    describeResult.description,
  );
  if (!decideResult || !decideResult.shouldRename) {
    const reason = decideResult?.reason || 'no-decision';
    offscreenLogger.log('[ImageUpgradeAI] Keeping baseline filename', {
      requestId: request.requestId,
      filename: request.baseline.final,
      reason,
    });
    return {
      status: 'keep-baseline',
      requestId: request.requestId,
      analyzedAt: Date.now(),
      reason,
      confidence: decideResult?.confidence,
      explanation: decideResult?.explanation,
      baselineFilename: request.baseline.final ?? request.filename,
      modelSource: 'on-device',
      decisionReason: decideResult?.reason,
      promptUsed: Boolean(decideResult),
    };
  }

  // PHASE 3: Filename Generation
  const generateResult = await runGeneratePhase(
    request,
    describeResult.description,
  );

  // Build proposal from all phases
  const proposal = buildProposalFromAnalysis(
    request,
    ingestion,
    describeResult,
    decideResult,
    generateResult,
    Date.now() - startedAt, // Total pipeline elapsed time
  );

  return proposal;
}
