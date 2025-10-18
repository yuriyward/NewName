/**
 * Offscreen PDF analysis request handler
 * Handles PDF file extraction, page rendering, and image-based analysis
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { verifyDirectoryPermission } from '@/entrypoints/shared/filesystem/directory-picker';
import { resolveFileHandle } from '@/entrypoints/shared/filesystem/file-reader';
import { getStoredDirectoryHandle } from '@/entrypoints/shared/filesystem/handle-storage';
import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
import { onExtensionMessage } from '@/entrypoints/shared/messaging/extension-messaging';
import { runImageUpgradePipeline } from './image-analysis/pipeline-orchestrator';
import { logPdfDebug } from './pdf-analysis/logging';
import { extractPdfPagesForAnalysis } from './pdf-analysis/pdf-page-extractor';
import type {
  PdfAnalysisSuccess,
  PdfPageIngestionResult,
  PdfUpgradeAnalysisErrorResponse,
  PdfUpgradeAnalysisRequest,
  PdfUpgradeAnalysisResponse,
  PdfUpgradeAnalysisUnavailable,
} from './pdf-analysis/types';

logPdfDebug('module-loaded', { timestamp: Date.now() });

let registered = false;

/**
 * Analyze a single extracted PDF page via image pipeline
 * @param pageBlob - PNG blob of rendered PDF page
 * @param pageNumber - Page number for debugging
 * @param request - Original PDF analysis request
 * @returns Upgrade proposal or null
 */
async function analyzeExtractedPage(
  pageBlob: Blob,
  pageNumber: number,
  request: PdfUpgradeAnalysisRequest,
): Promise<UpgradeProposal | null> {
  logPdfDebug('page-analysis-start', {
    requestId: request.requestId,
    pageNumber,
  });

  // Create synthetic ingestion result for this page
  // The ingestion pipeline expects ready-to-analyze PNG blobs
  const pageIngestionResult = {
    status: 'ingested' as const,
    requestId: `${request.requestId}-page-${pageNumber}`,
    analyzedAt: Date.now(),
    blob: pageBlob,
    mimeType: 'image/png',
    originalWidth: pageBlob.size, // Placeholder - will be updated by pipeline
    originalHeight: pageBlob.size,
    resizedWidth: pageBlob.size,
    resizedHeight: pageBlob.size,
    resizeRatio: 1.0,
    originalSizeBytes: pageBlob.size,
    metrics: {
      readBytes: pageBlob.size,
      elapsedMs: 0,
    },
  };

  // Reuse existing image upgrade pipeline
  const aiResponse = await runImageUpgradePipeline(
    request as any,
    pageIngestionResult as any,
  );
  if (aiResponse && aiResponse.status === 'success') {
    logPdfDebug('page-analysis-proposal', {
      requestId: request.requestId,
      pageNumber,
      proposedFilename: aiResponse.proposal.proposedFilename,
    });
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

      // Analyze each extracted page via image pipeline
      const proposals: UpgradeProposal[] = [];

      for (const page of extractionResult.pages) {
        logPdfDebug('page-analysis-page', {
          requestId: request.requestId,
          pageNumber: page.pageNumber,
          dimensions: `${page.width}x${page.height}`,
        });
        const proposal = await analyzeExtractedPage(
          page.blob,
          page.pageNumber,
          request,
        );
        if (proposal) {
          logPdfDebug('page-analysis-page-proposal', {
            requestId: request.requestId,
            pageNumber: page.pageNumber,
            proposedFilename: proposal.proposedFilename,
          });
          proposals.push(proposal);
        }
      }

      const elapsedMs = Math.round(performance.now() - startedAt);
      logPdfDebug('analysis-complete', {
        requestId: request.requestId,
        proposalsCount: proposals.length,
        elapsedMs,
      });

      // Return the best proposal (from first page if multiple)
      // In future, could implement more sophisticated merging
      const bestProposal = proposals[0];

      if (bestProposal) {
        logPdfDebug('analysis-success', {
          requestId: request.requestId,
          proposedFilename: bestProposal.proposedFilename,
          elapsedMs,
          pagesAnalyzed: proposals.length,
          totalPages: extractionResult.totalPages,
        });

        return {
          status: 'success' as const,
          requestId: request.requestId,
          analyzedAt: Date.now(),
          proposal: bestProposal,
          pagesAnalyzed: proposals.length,
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
