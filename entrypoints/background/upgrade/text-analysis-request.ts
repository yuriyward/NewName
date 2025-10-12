import { isTextExtension } from '@/entrypoints/shared/classification/file-types';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
import type { TextUpgradeAnalysisRequest } from '@/entrypoints/shared/integrations/text-analysis/types';
import { requestTextIngestion } from '@/entrypoints/shared/messaging/extension-messaging';
import {
  basename,
  extractExtension,
} from '@/entrypoints/shared/utils/filename';
import { requestMockUpgradeAnalysis } from './mock-analysis';
import type { UpgradeAnalysisInput } from './types';

const TEXT_ANALYSIS_MAX_BYTES = 128 * 1024;

function isTextCandidate(input: UpgradeAnalysisInput): boolean {
  const { historyItem, downloadItem } = input;
  if (historyItem.fileType !== 'data') {
    return false;
  }

  const finalName = historyItem.final || historyItem.original;
  const downloadName = downloadItem.filename;
  const extension =
    extractExtension(downloadName) ?? extractExtension(finalName);

  return isTextExtension(extension);
}

function buildTextRequest(
  input: UpgradeAnalysisInput,
  requestId: string,
): TextUpgradeAnalysisRequest {
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
      languagePreference: settings.language,
      mode: settings.cloud.enabled ? 'hybrid' : 'on-device',
      maxBytes: TEXT_ANALYSIS_MAX_BYTES,
      maxFilenameLength: settings.maxLen,
      separator: settings.separator,
      transliterateAscii: settings.transliterateAscii,
    },
  };
}

async function requestTextUpgradeAnalysisStub(
  input: UpgradeAnalysisInput,
): Promise<UpgradeProposal | null> {
  if (!isTextCandidate(input)) {
    return requestMockUpgradeAnalysis(input);
  }

  const requestId = `text-${input.historyItem.id}-${input.now}`;
  const request = buildTextRequest(input, requestId);

  try {
    const response = await requestTextIngestion(request);
    if (response.status === 'success') {
      debugLogger.log('[TextUpgradeAnalysis] Proposal received', {
        requestId,
        filename: request.filename,
        language: response.language,
        confidence: response.languageConfidence,
        truncated: response.truncatedInput,
      });
      return response.proposal;
    }

    if (response.status === 'ingested') {
      debugLogger.log('[TextUpgradeAnalysis] Text ingestion complete (no AI)', {
        requestId,
        filename: request.filename,
        readBytes: response.metrics.readBytes,
        truncated: response.truncated,
      });
    } else if (
      response.status === 'unavailable' ||
      response.status === 'skipped'
    ) {
      debugLogger.log('[TextUpgradeAnalysis] Text analysis unavailable', {
        requestId,
        status: response.status,
        reason: response.reason,
        message: response.message,
      });
    } else if (response.status === 'error') {
      debugLogger.warn('[TextUpgradeAnalysis] Text analysis error', {
        requestId,
        error: response.error,
        details: response.details,
      });
    }
  } catch (error) {
    debugLogger.warn('[TextUpgradeAnalysis] Text ingestion request failed', {
      requestId,
      error,
    });
  }

  return null;
}

export function createTextUpgradeAnalysisRequester(): (
  input: UpgradeAnalysisInput,
) => Promise<UpgradeProposal | null> {
  return requestTextUpgradeAnalysisStub;
}
