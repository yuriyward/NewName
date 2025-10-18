/**
 * Offscreen PDF analysis request handler
 * Handles PDF file extraction, page rendering, and image-based analysis
 */

import { verifyDirectoryPermission } from '@/entrypoints/shared/filesystem/directory-picker';
import { resolveFileHandle } from '@/entrypoints/shared/filesystem/file-reader';
import { getStoredDirectoryHandle } from '@/entrypoints/shared/filesystem/handle-storage';
import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
import { onExtensionMessage } from '@/entrypoints/shared/messaging/extension-messaging';
import { generateFilenamePhase3 } from './image-analysis/phase3-filename-generation';
import { logPdfDebug } from './pdf-analysis/logging';
import { mergePdfContext } from './pdf-analysis/pdf-context-merger';
import { extractPdfPagesForAnalysis } from './pdf-analysis/pdf-page-extractor';
import { decidePdfRename } from './pdf-analysis/pdf-rename-decision';
import { extractPdfTitlesAndDescriptions } from './pdf-analysis/pdf-title-description';
import type {
  PdfAnalysisSuccess,
  PdfPageIngestionResult,
  PdfUpgradeAnalysisErrorResponse,
  PdfUpgradeAnalysisRequest,
  PdfUpgradeAnalysisUnavailable,
} from './pdf-analysis/types';

logPdfDebug('module-loaded', { timestamp: Date.now() });

let registered = false;

/**
 * Analyze extracted PDF pages: Phase 1 (title/description) + Phase 2-3 (rename decision + generation)
 * @param pageBlobs - PNG blobs of rendered PDF pages
 * @param request - Original PDF analysis request
 * @returns Upgrade proposal or null
 */
async function analyzePdfPages(
  pageBlobs: Blob[],
  request: PdfUpgradeAnalysisRequest,
): Promise<UpgradeProposal | null> {
  logPdfDebug('pdf-analysis-phase1-start', {
    requestId: request.requestId,
    pageCount: pageBlobs.length,
  });

  // PHASE 1: Extract titles and descriptions from PDF pages
  const titleDescriptionContext =
    await extractPdfTitlesAndDescriptions(pageBlobs);

  if (!titleDescriptionContext) {
    logPdfDebug('pdf-analysis-phase1-failed', {
      requestId: request.requestId,
    });
    return null;
  }

  logPdfDebug('pdf-analysis-phase1-complete', {
    requestId: request.requestId,
    documentTitle: titleDescriptionContext.documentTitle || 'not-found',
    pagesAnalyzed: titleDescriptionContext.pageAnalyses.length,
  });

  // Merge the context for filename generation
  const mergedContext = mergePdfContext(titleDescriptionContext);

  // PHASE 2: PDF-specific rename decision
  // Decides if we should rename based on extracted title and baseline quality
  logPdfDebug('pdf-analysis-phase2-start', {
    requestId: request.requestId,
    hasDocumentTitle: !!mergedContext.documentTitle,
  });

  const renameDecision = await decidePdfRename(
    titleDescriptionContext,
    request.baseline.final || request.filename,
  );

  logPdfDebug('pdf-analysis-phase2-complete', {
    requestId: request.requestId,
    shouldRename: renameDecision.shouldRename,
    reason: renameDecision.reason,
    confidence: renameDecision.confidence,
  });

  // If Phase 2 decides not to rename, return null (no proposal)
  if (!renameDecision.shouldRename) {
    logPdfDebug('pdf-analysis-no-rename', {
      requestId: request.requestId,
      reason: renameDecision.reason,
    });
    return null;
  }

  // PHASE 3: Filename generation
  // Use the merged PDF context directly for filename generation
  logPdfDebug('pdf-analysis-phase3-start', {
    requestId: request.requestId,
    hasDocumentTitle: !!mergedContext.documentTitle,
  });

  // Create synthetic ingestion result for Phase 3
  // Use the first page as reference (similar to image pipeline)
  const pageIngestionResult = {
    status: 'ingested' as const,
    requestId: request.requestId,
    analyzedAt: Date.now(),
    blob: pageBlobs[0], // Use first page
    mimeType: 'image/png',
    originalWidth: pageBlobs[0].size,
    originalHeight: pageBlobs[0].size,
    resizedWidth: pageBlobs[0].size,
    resizedHeight: pageBlobs[0].size,
    resizeRatio: 1.0,
    originalSizeBytes: pageBlobs[0].size,
    metrics: {
      readBytes: pageBlobs[0].size,
      elapsedMs: 0,
    },
  };

  // Pass PDF context through request for Phase 3 to use
  // biome-ignore lint/suspicious/noExplicitAny: PDF context attached to request
  const requestWithPdfContext = {
    ...request,
    _pdfContext: mergedContext, // Pass PDF context through for title prioritization
  } as any;

  // Call Phase 3 directly (skip image pipeline to avoid Phase 2 override)
  // This ensures our Phase 2 rename decision is respected
  const aiResponse = await generateFilenamePhase3(
    requestWithPdfContext,
    pageIngestionResult as any,
    mergedContext.fullDescription, // Use merged description with title context
    renameDecision.confidence, // Use our Phase 2 confidence
    true, // promptUsed: true (AI was used for description)
  );

  if (aiResponse && aiResponse.status === 'success') {
    logPdfDebug('pdf-analysis-success', {
      requestId: request.requestId,
      proposedFilename: aiResponse.proposal.proposedFilename,
      hasPdfTitle: !!mergedContext.documentTitle,
      reason: renameDecision.reason,
    });
    return aiResponse.proposal;
  }

  logPdfDebug('pdf-analysis-phase3-failed', {
    requestId: request.requestId,
  });
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
    logPdfDebug('request-received', {
      requestId: request.requestId,
      filename: request.filename,
      relativePath: request.relativePath,
    });

    try {
      // Verify downloads directory handle exists and is accessible
      const rootHandle = await getStoredDirectoryHandle();
      if (!rootHandle) {
        logPdfDebug('request-unavailable', {
          requestId: request.requestId,
          reason: 'no-directory-handle',
        });
        return unavailable(
          request,
          'permissions-denied',
          'No Downloads directory handle stored',
        );
      }

      const permission = await verifyDirectoryPermission(rootHandle);
      if (permission !== 'granted') {
        logPdfDebug('request-unavailable', {
          requestId: request.requestId,
          reason: 'permission-denied',
          permission,
        });
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
        logPdfDebug('request-error', {
          requestId: request.requestId,
          error: fileResult.error,
          reason: 'resolve-file-failed',
        });
        return errorResult(request, fileResult.error);
      }

      // Extract PDF pages as PNG blobs
      const extractionResult = await extractPdfPagesForAnalysis(
        fileResult.fileHandle,
      );

      logPdfDebug('extraction-complete', {
        requestId: request.requestId,
        success: extractionResult.success,
        pages: extractionResult.success ? extractionResult.pages.length : 0,
        errorType: extractionResult.success
          ? undefined
          : extractionResult.errorType,
      });

      if (!extractionResult.success) {
        logPdfDebug('request-error', {
          requestId: request.requestId,
          reason: 'extraction-failed',
          error: extractionResult.error,
          errorType: extractionResult.errorType,
        });
        return errorResult(request, extractionResult.error);
      }

      if (extractionResult.pages.length === 0) {
        logPdfDebug('request-unavailable', {
          requestId: request.requestId,
          reason: 'no-pages',
        });
        return unavailable(request, 'no-pages', 'No pages extracted from PDF');
      }

      // PHASE 1: Extract titles and descriptions + PHASE 2-3: Rename decision and generation
      const pageBlobs = extractionResult.pages.map((p) => p.blob);
      const proposal = await analyzePdfPages(pageBlobs, request);

      const elapsedMs = Math.round(performance.now() - startedAt);

      if (proposal) {
        logPdfDebug('analysis-success', {
          requestId: request.requestId,
          proposedFilename: proposal.proposedFilename,
          elapsedMs,
          totalPages: extractionResult.totalPages,
        });

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
      logPdfDebug('analysis-ingested', {
        requestId: request.requestId,
        pagesExtracted: extractionResult.pages.length,
        elapsedMs,
      });

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
      logPdfDebug('analysis-error', {
        requestId: (data as PdfUpgradeAnalysisRequest).requestId,
        message,
      });
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
