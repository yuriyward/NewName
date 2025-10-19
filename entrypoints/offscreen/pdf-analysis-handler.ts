/**
 * Offscreen PDF analysis request handler
 * Handles PDF file extraction, page rendering, and image-based analysis
 */

import { verifyDirectoryPermission } from '@/entrypoints/shared/filesystem/directory-picker';
import { resolveFileHandle } from '@/entrypoints/shared/filesystem/file-reader';
import { getStoredDirectoryHandle } from '@/entrypoints/shared/filesystem/handle-storage';
import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
import type {
  ImageIngestionResult,
  ImageUpgradeAnalysisRequest,
} from '@/entrypoints/shared/integrations/image-analysis/types';
import { onExtensionMessage } from '@/entrypoints/shared/messaging/extension-messaging';
import { generateFilenamePhase3 } from './image-analysis/phase3-filename-generation';
import { mergePdfContext } from './pdf-analysis/pdf-context-merger';
import {
  type ExtractedPageForAnalysis,
  extractPdfPagesForAnalysis,
} from './pdf-analysis/pdf-page-extractor';
import { decidePdfRename } from './pdf-analysis/pdf-rename-decision';
import { extractPdfTitlesAndDescriptions } from './pdf-analysis/pdf-title-description';
import type {
  PdfAnalysisSuccess,
  PdfPageIngestionResult,
  PdfUpgradeAnalysisErrorResponse,
  PdfUpgradeAnalysisRequest,
  PdfUpgradeAnalysisUnavailable,
} from './pdf-analysis/types';

let registered = false;

/**
 * Analyze extracted PDF pages: Phase 1 (title/description) + Phase 2-3 (rename decision + generation)
 * @param pages - Extracted PDF pages ready for analysis
 * @param request - Original PDF analysis request
 * @returns Upgrade proposal or null
 */
async function analyzePdfPages(
  pages: ExtractedPageForAnalysis[],
  request: PdfUpgradeAnalysisRequest,
): Promise<UpgradeProposal | null> {
  // PHASE 1: Extract titles and descriptions from PDF pages
  const titleDescriptionContext = await extractPdfTitlesAndDescriptions(
    pages.map((page) => page.blob),
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
    return null;
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
  return null;
}

/**
 * Initialize the PDF analysis handler
 * Registers listener for PDF analysis requests from background context
 */
export function initializePdfAnalysisHandler(): void {
  if (registered) {
    return;
  }
  registered = true;

  onExtensionMessage('requestPdfAnalysis', async ({ data }) => {
    const request = data as PdfUpgradeAnalysisRequest;
    const startedAt = performance.now();
    try {
      // Verify downloads directory handle exists and is accessible
      const rootHandle = await getStoredDirectoryHandle();
      if (!rootHandle) {
        return unavailable(
          request,
          'permissions-denied',
          'No Downloads directory handle stored',
        );
      }

      const permission = await verifyDirectoryPermission(rootHandle);
      if (permission !== 'granted') {
        return unavailable(
          request,
          'permissions-denied',
          'Downloads directory permission not granted',
        );
      }

      // Resolve file handle from path
      const fileResult = await resolveFileHandle(
        rootHandle,
        request.relativePath,
        request.filename,
      );

      if (!fileResult.success) {
        return errorResult(request, fileResult.error);
      }

      // Extract PDF pages as PNG blobs
      const extractionResult = await extractPdfPagesForAnalysis(
        fileResult.fileHandle,
      );
      if (!extractionResult.success) {
        return errorResult(request, extractionResult.error);
      }

      if (extractionResult.pages.length === 0) {
        return unavailable(request, 'no-pages', 'No pages extracted from PDF');
      }

      // PHASE 1: Extract titles and descriptions + PHASE 2-3: Rename decision and generation
      const proposal = await analyzePdfPages(extractionResult.pages, request);

      const elapsedMs = Math.round(performance.now() - startedAt);

      if (proposal) {
        return {
          status: 'success' as const,
          requestId: request.requestId,
          analyzedAt: Date.now(),
          proposal,
          pagesAnalyzed: extractionResult.pages.length,
          totalPages: extractionResult.totalPages,
        } satisfies PdfAnalysisSuccess;
      }

      // No proposal from any page - return ingestion result
      return {
        status: 'ingested' as const,
        requestId: request.requestId,
        analyzedAt: Date.now(),
        pageCount: extractionResult.pages.length,
        pages: extractionResult.pages.map((p) => ({
          pageNumber: p.pageNumber,
          width: p.width,
          height: p.height,
        })),
      } satisfies PdfPageIngestionResult;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'PDF analysis failed';
      return errorResult(data as PdfUpgradeAnalysisRequest, message);
    }
  });
}

function unavailable(
  request: PdfUpgradeAnalysisRequest,
  reason: 'permissions-denied' | 'invalid-pdf' | 'no-pages' | 'unsupported',
  message: string,
): PdfUpgradeAnalysisUnavailable {
  return {
    status: 'unavailable',
    requestId: request.requestId,
    analyzedAt: Date.now(),
    reason,
    message,
  };
}

function errorResult(
  request: PdfUpgradeAnalysisRequest,
  error: string,
): PdfUpgradeAnalysisErrorResponse {
  return {
    status: 'error',
    requestId: request.requestId,
    analyzedAt: Date.now(),
    error,
  };
}
