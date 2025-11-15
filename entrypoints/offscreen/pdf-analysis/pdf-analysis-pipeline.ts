/**
 * PDF upgrade analysis pipeline orchestrator
 * Coordinates PDF analysis: extraction → title/description → rename decision → filename generation
 * Parallels the image analysis pipeline structure for consistency
 */

import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
import type {
  ImageIngestionResult,
  ImageUpgradeAnalysisRequest,
} from '@/entrypoints/shared/integrations/image-analysis/types';
import { generateFilenamePhase3 } from '../image-analysis/phase3-filename-generation';
import { mergePdfContext } from './pdf-context-merger';
import type { ExtractedPageForAnalysis } from './pdf-page-extractor';
import { decidePdfRename } from './pdf-rename-decision';
import { extractPdfTitlesAndDescriptions } from './pdf-title-description';
import type {
  PdfUpgradeAnalysisKeepBaseline,
  PdfUpgradeAnalysisRequest,
} from './types';

/**
 * Run the complete PDF upgrade analysis pipeline
 * PHASE 1: Extract titles and descriptions from PDF pages
 * PHASE 2: PDF-specific rename decision
 * PHASE 3: Filename generation using merged context
 *
 * @param pages - Extracted PDF pages ready for analysis
 * @param request - Original PDF analysis request
 * @returns Upgrade proposal or null if filename should not be changed
 */
export async function runPdfUpgradePipeline(
  pages: ExtractedPageForAnalysis[],
  request: PdfUpgradeAnalysisRequest,
): Promise<UpgradeProposal | PdfUpgradeAnalysisKeepBaseline | null> {
  // PHASE 1: Extract titles and descriptions from PDF pages
  const titleDescriptionContext = await extractPdfTitlesAndDescriptions(
    pages.map((page) => page.blob),
    request.pageContext,
  );

  if (!titleDescriptionContext) {
    return null;
  }

  // Merge the context for filename generation
  const mergedContext = mergePdfContext(titleDescriptionContext);

  // PHASE 2: PDF-specific rename decision
  // Decides if we should rename based on extracted title and baseline quality
  const renameDecision = await decidePdfRename(
    titleDescriptionContext,
    request.baseline.final || request.filename,
  );

  // If Phase 2 decides not to rename, return null (no proposal)
  if (!renameDecision.shouldRename) {
    return {
      status: 'keep-baseline',
      requestId: request.requestId,
      analyzedAt: Date.now(),
      reason: renameDecision.reason,
      confidence: renameDecision.confidence,
      explanation: renameDecision.explanation,
      baselineFilename: request.baseline.final || request.filename,
    } satisfies PdfUpgradeAnalysisKeepBaseline;
  }

  // PHASE 3: Filename generation
  // Use the merged PDF context directly for filename generation
  // Create synthetic ingestion result for Phase 3
  // Use the first page as reference (similar to image pipeline)
  const firstPage = pages[0];
  const pageIngestionResult: ImageIngestionResult = {
    status: 'ingested' as const,
    requestId: request.requestId,
    analyzedAt: Date.now(),
    blob: firstPage.blob, // Use first page
    mimeType: 'image/png',
    originalWidth: firstPage.width,
    originalHeight: firstPage.height,
    resizedWidth: firstPage.width,
    resizedHeight: firstPage.height,
    resizeRatio: 1.0,
    originalSizeBytes: firstPage.blob.size,
    metrics: {
      readBytes: firstPage.blob.size,
      elapsedMs: 0,
    },
  };

  // Create request with PDF context for Phase 3 (type-safe)
  const requestWithPdfContext: ImageUpgradeAnalysisRequest = {
    ...request,
    pdfContext: {
      documentTitle: mergedContext.documentTitle,
      shouldPrioritizeTitle: mergedContext.shouldPrioritizeTitle,
    },
  };

  // Call Phase 3 directly (skip image pipeline to avoid Phase 2 override)
  // This ensures our Phase 2 rename decision is respected
  const aiResponse = await generateFilenamePhase3(
    requestWithPdfContext,
    pageIngestionResult,
    mergedContext.fullDescription, // Use merged description with title context
    renameDecision.confidence, // Use our Phase 2 confidence
    true, // promptUsed: true (AI was used for description)
  );

  if (aiResponse && aiResponse.status === 'success') {
    return aiResponse.proposal;
  }

  if (aiResponse && aiResponse.status === 'keep-baseline') {
    return {
      status: 'keep-baseline',
      requestId: aiResponse.requestId,
      analyzedAt: aiResponse.analyzedAt,
      reason: aiResponse.reason,
      confidence: aiResponse.confidence,
      explanation: aiResponse.explanation,
      baselineFilename: aiResponse.baselineFilename,
    } satisfies PdfUpgradeAnalysisKeepBaseline;
  }

  return null;
}
