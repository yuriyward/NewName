/**
 * PDF upgrade analysis request builder
 * Determines PDF eligibility and creates analysis requests
 */

import { MAX_PDF_FILE_SIZE_BYTES } from '@/entrypoints/offscreen/pdf-analysis/constants';
import type { PdfUpgradeAnalysisRequest } from '@/entrypoints/offscreen/pdf-analysis/types';
import { isPdfExtension } from '@/entrypoints/shared/classification/file-types';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
import { ensureOffscreenReady } from '@/entrypoints/shared/integrations/mediainfo/offscreen-coordinator';
import { requestPdfAnalysis } from '@/entrypoints/shared/messaging/extension-messaging';
import {
  basename,
  extractExtension,
} from '@/entrypoints/shared/utils/filename';
import { requestMockUpgradeAnalysis } from './mock-analysis';
import type { UpgradeAnalysisInput } from './types';

/**
 * Check if a file is a candidate for PDF upgrade analysis
 * @param input - Upgrade analysis input with file metadata
 * @returns true if file should be analyzed as PDF
 */
function isPdfCandidate(input: UpgradeAnalysisInput): boolean {
  const { historyItem, downloadItem } = input;
  if (historyItem.fileType !== 'pdf') {
    return false;
  }

  const finalName = historyItem.final || historyItem.original;
  const downloadName = downloadItem.filename;
  const extension =
    extractExtension(downloadName) ?? extractExtension(finalName);

  return isPdfExtension(extension);
}

/**
 * Build PDF upgrade analysis request
 * @param input - Upgrade analysis input
 * @param requestId - Unique request identifier
 * @returns PDF analysis request ready to send to offscreen
 */
function buildPdfRequest(
  input: UpgradeAnalysisInput,
  requestId: string,
): PdfUpgradeAnalysisRequest {
  const { historyItem, downloadItem, settings } = input;
  const filename =
    downloadItem.filename ??
    basename(historyItem.final || historyItem.original);

  return {
    requestId,
    historyId: historyItem.id,
    downloadId: input.downloadId,
    url: downloadItem.url ?? null,
    filename,
    relativePath: historyItem.path,
    mimeType: null,
    sizeBytes: downloadItem.totalBytes,
    fileType: 'pdf',
    baseline: {
      original: historyItem.original,
      final: historyItem.final,
      decision: historyItem.decision,
    },
    settings: {
      mode: 'on-device-only',
      maxBytes: MAX_PDF_FILE_SIZE_BYTES,
      maxFilenameLength: settings.maxLen,
      separator: settings.separator,
      transliterateAscii: settings.transliterateAscii,
    },
  };
}

/**
 * Handle successful PDF analysis response
 * @param requestId - Request identifier for logging
 * @param request - Original analysis request
 * @param response - Response from offscreen handler
 * @returns UpgradeProposal from response
 */
function handleSuccessfulResponse(
  requestId: string,
  request: PdfUpgradeAnalysisRequest,
  response: any,
): UpgradeProposal {
  debugLogger.log(
    '[PdfUpgradeAnalysis] Analysis complete - proposal received',
    {
      requestId,
      proposedFilename: response.proposal?.proposedFilename,
    },
  );
  return response.proposal;
}

/**
 * Log non-success PDF analysis responses
 * @param requestId - Request identifier for logging
 * @param request - Original analysis request
 * @param response - Response from offscreen handler
 */
function logNonSuccessResponse(
  requestId: string,
  request: PdfUpgradeAnalysisRequest,
  response: any,
): void {
  if (response.status === 'ingested') {
    debugLogger.log(
      '[PdfUpgradeAnalysis] PDF pages extracted (no AI proposal)',
      {
        requestId,
        pagesExtracted: response.pageCount,
      },
    );
    return;
  }

  if (response.status === 'error') {
    debugLogger.warn('[PdfUpgradeAnalysis] Analysis error', {
      requestId,
      error: response.error,
    });
  }
}

/**
 * Request PDF upgrade analysis from offscreen context
 * @param input - Upgrade analysis input with file metadata
 * @returns UpgradeProposal or null if analysis not performed
 */
async function requestPdfUpgradeAnalysis(
  input: UpgradeAnalysisInput,
): Promise<UpgradeProposal | null> {
  if (!isPdfCandidate(input)) {
    // Fall back to mock analysis for non-PDF files
    return requestMockUpgradeAnalysis(input);
  }

  const requestId = `pdf-${input.historyItem.id}-${input.now}`;
  const request = buildPdfRequest(input, requestId);

  try {
    await ensureOffscreenReady();
    const response = await requestPdfAnalysis(request);

    if (response.status === 'success') {
      return handleSuccessfulResponse(requestId, request, response);
    }

    logNonSuccessResponse(requestId, request, response);
  } catch (error) {
    debugLogger.warn('[PdfUpgradeAnalysis] Request failed', {
      requestId,
      error,
    });
  }

  return null;
}

/**
 * Create PDF upgrade analysis requester function
 * @returns Function that performs PDF upgrade analysis
 */
export function createPdfUpgradeAnalysisRequester(): (
  input: UpgradeAnalysisInput,
) => Promise<UpgradeProposal | null> {
  return async (input) => await requestPdfUpgradeAnalysis(input);
}
