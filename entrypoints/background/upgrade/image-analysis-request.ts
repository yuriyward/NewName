/**
 * Image upgrade analysis request builder
 * Determines image eligibility and creates analysis requests
 */

import { isImageExtension } from '@/entrypoints/shared/classification/file-types';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
import { MAX_IMAGE_FILE_SIZE_BYTES } from '@/entrypoints/shared/integrations/image-analysis/constants';
import type { ImageUpgradeAnalysisRequest } from '@/entrypoints/shared/integrations/image-analysis/types';
import { ensureOffscreenReady } from '@/entrypoints/shared/integrations/mediainfo/offscreen-coordinator';
import { requestImageIngestion } from '@/entrypoints/shared/messaging/media-messages';
import {
  basename,
  extractExtension,
} from '@/entrypoints/shared/utils/filename';
import { requestMockUpgradeAnalysis } from './mock-analysis';
import type { UpgradeAnalysisInput } from './types';

/**
 * Check if a file is a candidate for image upgrade analysis
 * @param input - Upgrade analysis input with file metadata
 * @returns true if file should be analyzed as image
 */
function isImageCandidate(input: UpgradeAnalysisInput): boolean {
  const { historyItem, downloadItem } = input;
  if (historyItem.fileType !== 'image') {
    return false;
  }

  const finalName = historyItem.final || historyItem.original;
  const downloadName = downloadItem.filename;
  const extension =
    extractExtension(downloadName) ?? extractExtension(finalName);

  return isImageExtension(extension);
}

/**
 * Build image upgrade analysis request
 * @param input - Upgrade analysis input
 * @param requestId - Unique request identifier
 * @returns Image analysis request ready to send to offscreen
 */
function buildImageRequest(
  input: UpgradeAnalysisInput,
  requestId: string,
): ImageUpgradeAnalysisRequest {
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
    sizeBytes: downloadItem.totalBytes ?? undefined,
    fileType: historyItem.fileType,
    baseline: {
      original: historyItem.original,
      final: historyItem.final,
      decision: historyItem.decision,
    },
    settings: {
      mode: 'on-device-only', // Images don't support cloud fallback yet
      maxBytes: MAX_IMAGE_FILE_SIZE_BYTES,
      maxFilenameLength: settings.maxLen,
      separator: settings.separator,
      transliterateAscii: settings.transliterateAscii,
    },
  };
}

/**
 * Handle successful image analysis response
 * @param requestId - Request identifier for logging
 * @param request - Original analysis request
 * @param response - Response from offscreen handler
 * @returns UpgradeProposal from response
 */
function handleSuccessfulResponse(
  requestId: string,
  request: ImageUpgradeAnalysisRequest,
  response: Extract<
    Awaited<ReturnType<typeof requestImageIngestion>>,
    { status: 'success' }
  >,
): UpgradeProposal {
  debugLogger.log('[ImageUpgradeAnalysis] Proposal received', {
    requestId,
    filename: request.filename,
    description: response.description,
    confidence: response.promptConfidence,
    proposalSummary: response.proposal.summary,
  });
  return response.proposal;
}

/**
 * Log non-success image analysis responses
 * @param requestId - Request identifier for logging
 * @param request - Original analysis request
 * @param response - Response from offscreen handler
 */
function logNonSuccessResponse(
  requestId: string,
  request: ImageUpgradeAnalysisRequest,
  response: Exclude<
    Awaited<ReturnType<typeof requestImageIngestion>>,
    { status: 'success' }
  >,
): void {
  if (response.status === 'ingested') {
    debugLogger.log('[ImageUpgradeAnalysis] Image ingestion complete (no AI)', {
      requestId,
      filename: request.filename,
    });
    return;
  }

  if (response.status === 'unavailable' || response.status === 'skipped') {
    debugLogger.log('[ImageUpgradeAnalysis] Image analysis unavailable', {
      requestId,
      status: response.status,
      reason: 'reason' in response ? response.reason : 'unknown',
      message: 'message' in response ? response.message : undefined,
    });
    return;
  }

  if (response.status === 'error') {
    debugLogger.warn('[ImageUpgradeAnalysis] Image analysis error', {
      requestId,
      error: response.error,
    });
  }
}

/**
 * Request image upgrade analysis from offscreen context
 * @param input - Upgrade analysis input with file metadata
 * @returns UpgradeProposal or null if analysis not performed
 */
async function requestImageUpgradeAnalysis(
  input: UpgradeAnalysisInput,
): Promise<UpgradeProposal | null> {
  if (!isImageCandidate(input)) {
    // Fall back to mock analysis for non-image files
    return requestMockUpgradeAnalysis(input);
  }

  const requestId = `image-${input.historyItem.id}-${input.now}`;
  const request = buildImageRequest(input, requestId);

  try {
    await ensureOffscreenReady();
    const response = await requestImageIngestion(request);

    if (response.status === 'success') {
      return handleSuccessfulResponse(requestId, request, response);
    }

    logNonSuccessResponse(requestId, request, response);
  } catch (error) {
    debugLogger.warn('[ImageUpgradeAnalysis] Image ingestion request failed', {
      requestId,
      error,
    });
  }

  return null;
}

/**
 * Create image upgrade analysis requester function
 * @returns Function that performs image upgrade analysis
 */
export function createImageUpgradeAnalysisRequester(): (
  input: UpgradeAnalysisInput,
) => Promise<UpgradeProposal | null> {
  return async (input) => await requestImageUpgradeAnalysis(input);
}
