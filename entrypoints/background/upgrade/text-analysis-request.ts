import { isTextExtension } from '@/entrypoints/shared/classification/file-types';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
import { ensureOffscreenReady } from '@/entrypoints/shared/integrations/mediainfo/offscreen-coordinator';
import type {
  CloudConsentDecision,
  TextAnalysisMode,
  TextUpgradeAnalysisRequest,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import { requestTextIngestion } from '@/entrypoints/shared/messaging/text-messages';
import {
  basename,
  extractExtension,
} from '@/entrypoints/shared/utils/filename';
import type { CloudConsentRequestContext } from './cloud-consent-manager';
import { requestMockUpgradeAnalysis } from './mock-analysis';
import type { UpgradeAnalysisInput } from './types';

const TEXT_ANALYSIS_MAX_BYTES = 128 * 1024;

interface TextUpgradeAnalysisRequesterDependencies {
  requestCloudConsent?: (
    context: CloudConsentRequestContext,
  ) => Promise<CloudConsentDecision>;
  applyCloudAlways?: () => Promise<void>;
}

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
  modeOverride?: TextAnalysisMode,
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
    pageContext: historyItem.pageContext,
    settings: {
      languagePreference: settings.language,
      mode: modeOverride ?? resolveTextAnalysisMode(settings),
      maxBytes: TEXT_ANALYSIS_MAX_BYTES,
      maxFilenameLength: settings.maxLen,
      separator: settings.separator,
      transliterateAscii: settings.transliterateAscii,
    },
    cloudConfig: {
      enabled: settings.cloud.enabled,
      apiKey: settings.cloud.apiKey,
      model: settings.cloud.model,
      consentGiven: settings.cloud.consentGiven,
      consentTimestamp: settings.cloud.consentTimestamp,
    },
    processingPreferences: {
      text: settings.processingPreferences.text,
      pdf: settings.processingPreferences.pdf,
      image: settings.processingPreferences.image,
    },
  };
}

function resolveTextAnalysisMode(
  settings: UpgradeAnalysisInput['settings'],
): TextAnalysisMode {
  if (!settings.cloud.enabled) {
    return 'on-device-only';
  }

  switch (settings.cloud.textFallbackMode) {
    case 'always':
      return 'hybrid-always';
    case 'ask':
      return 'hybrid-ask';
    default:
      return 'on-device-only';
  }
}

function handleSuccessfulResponse(
  requestId: string,
  request: TextUpgradeAnalysisRequest,
  response: Extract<
    Awaited<ReturnType<typeof requestTextIngestion>>,
    { status: 'success' }
  >,
): UpgradeProposal {
  debugLogger.log('[TextUpgradeAnalysis] Proposal received', {
    requestId,
    filename: request.filename,
    language: response.language,
    confidence: response.languageConfidence,
    truncated: response.truncatedInput,
    modelSource: response.modelSource,
    promptConfidence: response.promptConfidence,
    proposalSummary: response.proposal.summary,
  });
  return response.proposal;
}

function logNonSuccessResponse(
  requestId: string,
  request: TextUpgradeAnalysisRequest,
  response: Exclude<
    Awaited<ReturnType<typeof requestTextIngestion>>,
    { status: 'success' | 'permission-required' }
  >,
): void {
  if (response.status === 'ingested') {
    debugLogger.log('[TextUpgradeAnalysis] Text ingestion complete (no AI)', {
      requestId,
      filename: request.filename,
      readBytes: response.metrics.readBytes,
      truncated: response.truncated,
    });
    return;
  }

  if (response.status === 'unavailable' || response.status === 'skipped') {
    debugLogger.log('[TextUpgradeAnalysis] Text analysis unavailable', {
      requestId,
      status: response.status,
      reason: response.reason,
      message: response.message,
    });
    return;
  }

  if (response.status === 'error') {
    debugLogger.warn('[TextUpgradeAnalysis] Text analysis error', {
      requestId,
      error: response.error,
      details: response.details,
    });
  }
}

async function requestTextUpgradeAnalysis(
  input: UpgradeAnalysisInput,
  deps: TextUpgradeAnalysisRequesterDependencies,
): Promise<UpgradeProposal | null> {
  if (!isTextCandidate(input)) {
    return requestMockUpgradeAnalysis(input);
  }

  const requestId = `text-${input.historyItem.id}-${input.now}`;
  const request = buildTextRequest(input, requestId);

  try {
    await ensureOffscreenReady();
    const response = await requestTextIngestion(request);
    if (response.status === 'success') {
      return handleSuccessfulResponse(requestId, request, response);
    }

    if (response.status === 'keep-baseline') {
      debugLogger.log('[TextUpgradeAnalysis] Baseline kept locally', {
        requestId,
        filename: request.filename,
        reason: response.reason,
        confidence: response.confidence,
      });
      return null;
    }

    if (response.status === 'permission-required') {
      if (!deps.requestCloudConsent) {
        debugLogger.warn(
          '[TextUpgradeAnalysis] Consent required but no handler provided',
          {
            requestId,
            filename: request.filename,
          },
        );
        return null;
      }

      debugLogger.log('[TextUpgradeAnalysis] Cloud fallback requires consent', {
        requestId,
        filename: request.filename,
        reason: response.reason,
      });

      let decision: CloudConsentDecision;
      try {
        decision = await deps.requestCloudConsent({
          historyId: input.historyItem.id,
          downloadId: input.downloadId,
          filename: request.filename,
          baselineName: request.baseline.final ?? request.filename,
          relativePath: input.historyItem.path,
        });
      } catch (error) {
        debugLogger.warn('[TextUpgradeAnalysis] Consent handling failed', {
          requestId,
          error,
        });
        return null;
      }

      if (decision === 'deny') {
        debugLogger.log('[TextUpgradeAnalysis] Cloud consent denied', {
          requestId,
        });
        return null;
      }

      if (decision === 'allow-always') {
        await deps.applyCloudAlways?.();
      }

      const retryRequestId = `${requestId}-cloud`;
      const retryRequest = buildTextRequest(
        input,
        retryRequestId,
        'hybrid-always',
      );

      try {
        await ensureOffscreenReady();
        const retryResponse = await requestTextIngestion(retryRequest);
        if (retryResponse.status === 'success') {
          return handleSuccessfulResponse(
            retryRequestId,
            retryRequest,
            retryResponse,
          );
        }

        if (retryResponse.status === 'keep-baseline') {
          debugLogger.log(
            '[TextUpgradeAnalysis] Cloud fallback kept baseline',
            {
              requestId: retryRequestId,
              filename: retryRequest.filename,
              reason: retryResponse.reason,
              confidence: retryResponse.confidence,
            },
          );
          return null;
        }

        if (retryResponse.status === 'permission-required') {
          debugLogger.warn(
            '[TextUpgradeAnalysis] Consent loop detected, aborting cloud fallback',
            {
              requestId: retryRequestId,
            },
          );
          return null;
        }

        logNonSuccessResponse(retryRequestId, retryRequest, retryResponse);
      } catch (error) {
        debugLogger.warn(
          '[TextUpgradeAnalysis] Cloud fallback request failed',
          {
            requestId: retryRequestId,
            error,
          },
        );
      }

      return null;
    }

    logNonSuccessResponse(requestId, request, response);
  } catch (error) {
    debugLogger.warn('[TextUpgradeAnalysis] Text ingestion request failed', {
      requestId,
      error,
    });
  }

  return null;
}

export function createTextUpgradeAnalysisRequester(
  deps: TextUpgradeAnalysisRequesterDependencies = {},
): (input: UpgradeAnalysisInput) => Promise<UpgradeProposal | null> {
  return async (input) => await requestTextUpgradeAnalysis(input, deps);
}
