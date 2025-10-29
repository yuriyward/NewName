/**
 * Image upgrade proposal building
 * Constructs the final upgrade proposal with all metadata
 */

import {
  HIGH_CONFIDENCE_AUTO_APPLY_THRESHOLD,
  HIGH_CONFIDENCE_DISPLAY_THRESHOLD,
} from '@/entrypoints/shared/integrations/image-analysis/constants';
import type {
  ImageIngestionResult,
  ImageUpgradeAnalysisRequest,
  ImageUpgradeAnalysisSuccess,
} from '@/entrypoints/shared/integrations/image-analysis/types';
import type {
  TextUpgradeAnalysisRequest,
  TextUpgradeIngestionResult,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import {
  buildFilename,
  buildProposalSummary,
  buildProposedPath,
  extractStemFromBaseline,
  formatReasonTags,
} from '../text-analysis/filename-builder';
import type {
  DecidePhaseResult,
  DescribePhaseResult,
  GeneratePhaseResult,
} from './pipeline-phases';

/**
 * Build proposal from analysis results
 * Constructs TextUpgradeAnalysisRequest and ingestion data for filename building
 */
export function buildProposalFromAnalysis(
  request: ImageUpgradeAnalysisRequest,
  ingestion: ImageIngestionResult,
  describeResult: DescribePhaseResult,
  decideResult: DecidePhaseResult,
  generateResult: GeneratePhaseResult,
  decisionElapsedMs: number,
): ImageUpgradeAnalysisSuccess | null {
  // Use generated stem or fallback to baseline extraction
  const subject =
    generateResult.stem ||
    extractStemFromBaseline(request.baseline.final || request.filename);

  if (!subject || subject.trim().length === 0) {
    console.log('[ImageUpgradeAI] No valid subject for filename', {
      requestId: request.requestId,
    });
    return null;
  }

  // Create a compatible request object for buildFilename
  // (it only needs specific fields from the request and doesn't use ingestion)
  const requestForFilename: TextUpgradeAnalysisRequest = {
    requestId: request.requestId,
    historyId: request.historyId,
    downloadId: request.downloadId,
    url: request.url,
    filename: request.filename,
    relativePath: request.relativePath,
    mimeType: request.mimeType,
    sizeBytes: request.sizeBytes,
    fileType: request.fileType,
    baseline: request.baseline,
    settings: {
      languagePreference: 'auto',
      mode: request.settings.mode,
      maxBytes: request.settings.maxBytes,
      maxFilenameLength: request.settings.maxFilenameLength,
      separator: request.settings.separator,
      transliterateAscii: request.settings.transliterateAscii,
    },
    cloudConfig: request.cloudConfig,
    processingPreferences: request.processingPreferences,
  };

  const ingestionForFilename: TextUpgradeIngestionResult = {
    status: 'ingested',
    requestId: request.requestId,
    analyzedAt: ingestion.analyzedAt,
    text: describeResult.description,
    encoding: 'utf-8',
    originalLength: describeResult.description.length,
    truncated: false,
    sizeBytes: ingestion.originalSizeBytes,
    metrics: {
      readBytes: ingestion.metrics.readBytes,
      elapsedMs: ingestion.metrics.elapsedMs,
    },
  };

  const filenameResult = buildFilename({
    request: requestForFilename,
    ingestion: ingestionForFilename,
    subject,
    language: undefined,
  });

  const proposedFilename = filenameResult.filename;
  if (!proposedFilename || proposedFilename.length === 0) {
    return null;
  }

  const currentFinal = request.baseline.final ?? request.filename;
  if (
    currentFinal &&
    currentFinal.toLowerCase() === proposedFilename.toLowerCase()
  ) {
    return null; // No change needed
  }

  const proposedPath = buildProposedPath(
    request.relativePath,
    proposedFilename,
  );

  const promptUsed = !!generateResult.stem;
  const shouldAutoApply =
    decideResult.confidence >= HIGH_CONFIDENCE_AUTO_APPLY_THRESHOLD;

  const success: ImageUpgradeAnalysisSuccess = {
    status: 'success',
    requestId: request.requestId,
    analyzedAt: Date.now(),
    proposal: {
      proposedFilename,
      proposedPath,
      confidence:
        decideResult.confidence >= HIGH_CONFIDENCE_DISPLAY_THRESHOLD
          ? 'high'
          : 'suggested',
      autoApply: shouldAutoApply,
      reasonTags: formatReasonTags(undefined, promptUsed, 'on-device'),
      generatedAt: Date.now(),
      source: 'ai',
      summary:
        decideResult.explanation ||
        buildProposalSummary(undefined, describeResult.description),
    },
    description: describeResult.description,
    modelSource: 'on-device',
    promptConfidence: decideResult.confidence,
    promptUsed,
    decisionReason: decideResult.reason,
    metrics: {
      bytesFetched: ingestion.metrics.readBytes,
      requests: 1,
      elapsedMs: ingestion.metrics.elapsedMs,
      promptCalls: 3, // Describe + decision + generation
      decisionConfidence: decideResult.confidence,
      resizeRatio: ingestion.resizeRatio,
      originalWidth: ingestion.originalWidth,
      originalHeight: ingestion.originalHeight,
      resizedWidth: ingestion.resizedWidth,
      resizedHeight: ingestion.resizedHeight,
    },
  };

  console.log('[ImageUpgradeAI] Proposal created', {
    requestId: request.requestId,
    proposedFilename,
    proposalSummary: success.proposal.summary,
    totalElapsedMs:
      decisionElapsedMs +
      generateResult.elapsedMs +
      ingestion.metrics.elapsedMs,
  });

  return success;
}

/**
 * Build proposal from Phase 3 inputs (for direct Phase 3 calls)
 * Used by PDF pipeline which bypasses generic Phase 2
 *
 * @param request - Image upgrade analysis request
 * @param ingestion - Image ingestion result
 * @param description - Content description from Phase 1
 * @param generatedStem - Generated filename stem (or null if AI generation failed)
 * @param decisionConfidence - Confidence from Phase 2 decision
 * @param promptUsed - Whether AI prompt was used for generation
 * @returns Success response with proposal or null if generation failed
 */
export function buildProposalFromPhase3Inputs(
  request: ImageUpgradeAnalysisRequest,
  ingestion: ImageIngestionResult,
  description: string,
  generatedStem: string | null,
  decisionConfidence: number,
  promptUsed: boolean,
): ImageUpgradeAnalysisSuccess | null {
  // Use generated stem or fallback to baseline extraction
  const subject =
    generatedStem ||
    extractStemFromBaseline(request.baseline.final || request.filename);

  if (!subject || subject.trim().length === 0) {
    return null;
  }

  // Create a compatible request object for buildFilename
  // (it only needs specific fields from the request)
  const requestForFilename: TextUpgradeAnalysisRequest = {
    requestId: request.requestId,
    historyId: request.historyId,
    downloadId: request.downloadId,
    url: request.url,
    filename: request.filename,
    relativePath: request.relativePath,
    mimeType: request.mimeType,
    sizeBytes: request.sizeBytes,
    fileType: request.fileType,
    baseline: request.baseline,
    settings: {
      languagePreference: 'auto',
      mode: request.settings.mode,
      maxBytes: request.settings.maxBytes,
      maxFilenameLength: request.settings.maxFilenameLength,
      separator: request.settings.separator,
      transliterateAscii: request.settings.transliterateAscii,
    },
    cloudConfig: request.cloudConfig,
    processingPreferences: request.processingPreferences,
  };

  const ingestionForFilename: TextUpgradeIngestionResult = {
    status: 'ingested',
    requestId: request.requestId,
    analyzedAt: ingestion.analyzedAt,
    text: description,
    encoding: 'utf-8',
    originalLength: description.length,
    truncated: false,
    sizeBytes: ingestion.originalSizeBytes,
    metrics: {
      readBytes: ingestion.metrics.readBytes,
      elapsedMs: ingestion.metrics.elapsedMs,
    },
  };

  const filenameResult = buildFilename({
    request: requestForFilename,
    ingestion: ingestionForFilename,
    subject,
    language: undefined,
  });

  const proposedFilename = filenameResult.filename;
  if (!proposedFilename || proposedFilename.length === 0) {
    return null;
  }

  const currentFinal = request.baseline.final ?? request.filename;
  if (
    currentFinal &&
    currentFinal.toLowerCase() === proposedFilename.toLowerCase()
  ) {
    return null; // No change needed
  }

  const proposedPath = buildProposedPath(
    request.relativePath,
    proposedFilename,
  );

  const shouldAutoApply =
    decisionConfidence >= HIGH_CONFIDENCE_AUTO_APPLY_THRESHOLD;

  const success: ImageUpgradeAnalysisSuccess = {
    status: 'success',
    requestId: request.requestId,
    analyzedAt: Date.now(),
    proposal: {
      proposedFilename,
      proposedPath,
      confidence:
        decisionConfidence >= HIGH_CONFIDENCE_DISPLAY_THRESHOLD
          ? 'high'
          : 'suggested',
      autoApply: shouldAutoApply,
      reasonTags: formatReasonTags(undefined, promptUsed, 'on-device'),
      generatedAt: Date.now(),
      source: 'ai',
      summary: buildProposalSummary(undefined, description),
    },
    description,
    modelSource: 'on-device',
    promptConfidence: decisionConfidence,
    promptUsed,
    decisionReason: 'user-approved', // Phase 2 already decided to rename
    metrics: {
      bytesFetched: ingestion.metrics.readBytes,
      requests: 1,
      elapsedMs: ingestion.metrics.elapsedMs,
      promptCalls: 3, // Describe + decision + generation
      decisionConfidence,
      resizeRatio: ingestion.resizeRatio,
      originalWidth: ingestion.originalWidth,
      originalHeight: ingestion.originalHeight,
      resizedWidth: ingestion.resizedWidth,
      resizedHeight: ingestion.resizedHeight,
    },
  };

  return success;
}
