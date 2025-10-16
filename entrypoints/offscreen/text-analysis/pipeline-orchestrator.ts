/**
 * Note: This file uses console.log() instead of debugLogger.log() for operational logs.
 * Reason: Offscreen documents don't have storage access, so debugLogger.setEnabled()
 * fails. AI processing logs are diagnostic/operational and should always be visible.
 * We still use debugLogger.warn() and debugLogger.error() for warnings/errors.
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { AiModelStatusMap } from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import type {
  TextUpgradeAnalysisRequest,
  TextUpgradeAnalysisResponse,
  TextUpgradeAnalysisSuccess,
  TextUpgradeAnalysisUnavailable,
  TextUpgradeIngestionResult,
  TextUpgradeModelSource,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import { ensureAiModelsReadyRemote } from '@/entrypoints/shared/messaging/extension-messaging';
import {
  buildFilename,
  buildProposalSummary,
  buildProposedPath,
  extractStemFromBaseline,
  formatReasonTags,
} from './filename-builder';
import { detectLanguage } from './language-detection';
import { recordPipelineBlocked, recordPipelineRouted } from './telemetry';
import { summarizeText } from './text-summarization';

function mapModelStatuses(statuses: AiModelStatusMap): Record<string, string> {
  return Object.fromEntries(
    Object.entries(statuses).map(([key, value]) => [key, value.state]),
  );
}

function describeModelAvailabilityError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Chrome blocked on-device AI because the models are not downloaded yet. Open the AI Model Setup page to download Gemini Nano and try again.';
    }
    if (error.name === 'AbortError') {
      return 'On-device AI setup was cancelled before the models finished downloading.';
    }
  }
  if (error instanceof Error) {
    if (/unavailable/i.test(error.message)) {
      return "This device cannot use Chrome's built-in AI models. Check hardware requirements or update Chrome.";
    }
    return error.message;
  }
  return "Chrome's built-in AI models are not ready yet. Open the AI Model Setup page to finish downloading Gemini Nano.";
}

export async function runTextUpgradePipeline(
  request: TextUpgradeAnalysisRequest,
  ingestion: TextUpgradeIngestionResult,
): Promise<TextUpgradeAnalysisResponse | null> {
  const mode = request.settings.mode ?? 'on-device-only';
  if (mode === 'off') {
    return null;
  }

  // Enable language-detector and summarizer for text analysis
  let onDeviceReady = true;
  let modelStatuses: AiModelStatusMap | null = null;
  try {
    console.log('[TextUpgradeAI] Checking AI model availability', {
      requestId: request.requestId,
      models: ['language-detector', 'summarizer'],
    });

    // Ask background context to prepare the required models
    // Model preparation uses default options (key-points, markdown, short, English)
    modelStatuses = await ensureAiModelsReadyRemote({
      ids: ['language-detector', 'summarizer'],
    });
  } catch (error) {
    onDeviceReady = false;
    const message = describeModelAvailabilityError(error);
    debugLogger.warn('[TextUpgradeAI] Language detector unavailable', {
      requestId: request.requestId,
      mode,
      error,
    });
    recordPipelineBlocked(mode, message);
    if (mode === 'on-device-only' || mode === 'hybrid-ask') {
      return {
        status: 'unavailable',
        requestId: request.requestId,
        analyzedAt: Date.now(),
        reason: 'api-unavailable',
        message,
      } satisfies TextUpgradeAnalysisUnavailable;
    }
  }

  if (onDeviceReady && modelStatuses) {
    console.log('[TextUpgradeAI] AI models ready', {
      requestId: request.requestId,
      statuses: mapModelStatuses(modelStatuses),
    });
  }

  // Detect language
  const subjectLanguage = await detectLanguage(
    ingestion.text,
    request.settings.languagePreference,
  );

  // Generate summary using Chrome's built-in Summarizer API
  const summary = await summarizeText(ingestion.text, subjectLanguage.language);

  console.log('[TextUpgradeAI] Processing complete', {
    requestId: request.requestId,
    filename: request.filename,
    language: subjectLanguage.language,
    languageConfidence: subjectLanguage.confidence,
    languageSource: subjectLanguage.source,
    hasSummary: !!summary,
    summary: summary,
  });

  const modelSource: TextUpgradeModelSource = 'on-device';

  // Use baseline filename as subject (without extension)
  const subject = extractStemFromBaseline(
    request.baseline.final || request.filename,
  );
  if (!subject || subject.trim().length === 0) {
    return null;
  }

  const filenameResult = buildFilename({
    request,
    ingestion,
    subject,
    language: subjectLanguage.language,
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
    return null;
  }

  const proposedPath = buildProposedPath(
    request.relativePath,
    proposedFilename,
  );

  const promptUsed = false; // No prompt API used in simplified version

  const success: TextUpgradeAnalysisSuccess = {
    status: 'success',
    requestId: request.requestId,
    analyzedAt: Date.now(),
    proposal: {
      proposedFilename,
      proposedPath,
      confidence: 'suggested',
      autoApply: false,
      reasonTags: formatReasonTags(
        subjectLanguage.language,
        promptUsed,
        modelSource,
      ),
      generatedAt: Date.now(),
      source: 'ai',
      summary: buildProposalSummary(subjectLanguage.language, summary),
    },
    language: subjectLanguage.language,
    languageConfidence: subjectLanguage.confidence,
    modelSource,
    truncatedInput: ingestion.truncated,
    promptConfidence: undefined,
    promptUsed,
    metrics: {
      bytesFetched: ingestion.metrics.readBytes,
      requests: 1,
      elapsedMs: ingestion.metrics.elapsedMs,
    },
  };

  console.log('[TextUpgradeAI] Proposal created', {
    requestId: request.requestId,
    proposedFilename,
    proposalSummary: success.proposal.summary,
  });

  recordPipelineRouted(modelSource);
  return success;
}
