/**
 * Phase 3: Filename Generation (extracted from pipeline for reuse)
 * Generates filename stem based on content description
 * Can be called independently by other pipelines (e.g., PDF)
 *
 * Note: This is a thin wrapper around buildProposalFromPhase3Inputs
 * The stem generation is the only unique logic; proposal building is shared.
 */

import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import type {
  ImageIngestionResult,
  ImageUpgradeAnalysisKeepBaseline,
  ImageUpgradeAnalysisRequest,
  ImageUpgradeAnalysisSuccess,
} from '@/entrypoints/shared/integrations/image-analysis/types';
import { generateFilenameStem } from '../text-analysis/filename-generation';
import { buildProposalFromPhase3Inputs } from './proposal-builder';

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
): Promise<
  ImageUpgradeAnalysisSuccess | ImageUpgradeAnalysisKeepBaseline | null
> {
  const generationStartTime = Date.now();

  // Generate filename stem using Prompt API
  const generatedStem = await generateFilenameStem({
    summary: description,
    language: 'en', // Images/PDFs described in English
    currentBaseline: request.baseline.final || request.filename,
    settings: {
      maxLength: request.settings.maxFilenameLength,
      separator: request.settings.separator,
      transliterateAscii: request.settings.transliterateAscii,
    },
    // Pass PDF context if available (type-safe extraction)
    ...(request.pdfContext && {
      pdfContext: {
        source: 'pdf' as const,
        documentTitle: request.pdfContext.documentTitle,
        shouldPrioritizeTitle: request.pdfContext.shouldPrioritizeTitle,
      },
    }),
  });

  const generationElapsedMs = Date.now() - generationStartTime;

  offscreenLogger.log('[FilenameGeneration] Filename generation complete', {
    requestId: request.requestId,
    generatedStem,
    usedFallback: !generatedStem,
    elapsedMs: generationElapsedMs,
  });

  // Delegate proposal building to shared builder
  // This reuses the generic response assembly logic
  return buildProposalFromPhase3Inputs(
    request,
    ingestion,
    description,
    generatedStem,
    decisionConfidence,
    promptUsed,
  );
}
