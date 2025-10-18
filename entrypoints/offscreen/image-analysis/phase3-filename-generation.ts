/**
 * Phase 3: Filename Generation (extracted from pipeline for reuse)
 * Generates filename based on content description
 * Can be called independently by other pipelines (e.g., PDF)
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
import { generateFilenameStem } from '../text-analysis/filename-generation';

/**
 * Phase 3: Generate filename based on description and decision
 * This is extracted to allow other pipelines (PDF) to use it directly
 *
 * @param request - Image upgrade analysis request
 * @param ingestion - Image ingestion result
 * @param description - Content description from Phase 1
 * @param decisionConfidence - Confidence from Phase 2 decision (used for auto-apply threshold)
 * @param promptUsed - Whether AI prompt was used for description
 * @returns Success response with proposal or null if generation failed
 */
export async function generateFilenamePhase3(
  request: ImageUpgradeAnalysisRequest,
  ingestion: ImageIngestionResult,
  description: string,
  decisionConfidence: number,
  promptUsed: boolean,
): Promise<ImageUpgradeAnalysisSuccess | null> {
  const generationStartTime = Date.now();

  // Extract PDF context if available (passed through request for PDF pipeline)
  // biome-ignore lint/suspicious/noExplicitAny: PDF context passed through request object
  const pdfContext = (request as any)._pdfContext;

  const generatedStem = await generateFilenameStem({
    summary: description,
    language: 'en', // Images/PDFs described in English
    currentBaseline: request.baseline.final || request.filename,
    settings: {
      maxLength: request.settings.maxFilenameLength,
      separator: request.settings.separator,
      transliterateAscii: request.settings.transliterateAscii,
    },
    // Pass PDF context if available
    ...(pdfContext && {
      pdfContext: {
        source: 'pdf' as const,
        documentTitle: pdfContext.documentTitle,
        shouldPrioritizeTitle: pdfContext.shouldPrioritizeTitle,
      },
    }),
  });
  const generationElapsedMs = Date.now() - generationStartTime;

  // Use generated stem or fallback to baseline extraction
  const subject =
    generatedStem ||
    extractStemFromBaseline(request.baseline.final || request.filename);

  if (!subject || subject.trim().length === 0) {
    console.log('[FilenameGeneration] No valid subject for filename', {
      requestId: request.requestId,
    });
    return null;
  }

  console.log('[FilenameGeneration] Filename generation complete', {
    requestId: request.requestId,
    generatedStem,
    usedFallback: !generatedStem,
    elapsedMs: generationElapsedMs,
  });

  // ==================================================================
  // Build Proposal
  // ==================================================================
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

  console.log('[FilenameGeneration] Proposal created', {
    requestId: request.requestId,
    proposedFilename,
    proposalSummary: success.proposal.summary,
  });

  return success;
}
