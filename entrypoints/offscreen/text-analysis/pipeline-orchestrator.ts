/**
 * Note: Offscreen contexts cannot persist debug settings, so we route all operational logs
 * through offscreenLogger which is always enabled inside the offscreen document.
 * Higher-severity warnings/errors still use the same logger so we have a single output path.
 */

import { getAutoApplyBehavior } from '@/entrypoints/shared/constants/confidence-thresholds';
import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import type { AiModelStatusMap } from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import type {
  TextUpgradeAnalysisKeepBaseline,
  TextUpgradeAnalysisRequest,
  TextUpgradeAnalysisResponse,
  TextUpgradeAnalysisSuccess,
  TextUpgradeAnalysisUnavailable,
  TextUpgradeIngestionResult,
  TextUpgradeModelSource,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import { ensureAiModelsReadyRemote } from '@/entrypoints/shared/messaging/text-messages';
import {
  buildFilename,
  buildProposedPath,
  extractStemFromBaseline,
  formatReasonTags,
} from './filename-builder';
import { generateFilenameStem } from './filename-generation';
import { detectLanguage } from './language-detection';
import { decideIfShouldRename } from './rename-decision';
import {
  recordDecisionMade,
  recordGenerationFailure,
  recordGenerationSuccess,
  recordPipelineBlocked,
  recordPipelineRouted,
  recordPromptPipelineComplete,
} from './telemetry';
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
    offscreenLogger.log('[TextUpgradeAI] Checking AI model availability', {
      requestId: request.requestId,
      models: ['language-detector', 'summarizer', 'language-model'],
    });

    // Ask background context to prepare the required models
    // Model preparation uses default options (key-points, markdown, short, English)
    // language-model is for Prompt API (decision + generation)
    modelStatuses = await ensureAiModelsReadyRemote({
      ids: ['language-detector', 'summarizer', 'language-model'],
    });
  } catch (error) {
    onDeviceReady = false;
    const message = describeModelAvailabilityError(error);
    offscreenLogger.warn('[TextUpgradeAI] Language detector unavailable', {
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
    offscreenLogger.log('[TextUpgradeAI] AI models ready', {
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

  offscreenLogger.log(
    '[TextUpgradeAI] Language detection and summarization complete',
    {
      requestId: request.requestId,
      filename: request.filename,
      language: subjectLanguage.language,
      languageConfidence: subjectLanguage.confidence,
      languageSource: subjectLanguage.source,
      hasSummary: !!summary,
      summary: summary,
    },
  );

  const modelSource: TextUpgradeModelSource = 'on-device';

  // ===================================================================
  // PHASE 1: Rename Decision (Prompt API call #1)
  // Decide if the current filename needs renaming
  // ===================================================================
  const decisionStartTime = Date.now();
  const decision = await decideIfShouldRename({
    currentFilename: request.baseline.final || request.filename,
    summary: summary || undefined,
    language: subjectLanguage.language,
    originalName: request.filename,
    fileType: request.fileType,
    pageContext: request.pageContext,
  });
  const decisionElapsedMs = Date.now() - decisionStartTime;

  // Track decision metrics
  if (decision) {
    recordDecisionMade(
      decision.shouldRename,
      decision.reason,
      decision.confidence,
    );
  }

  // If AI says don't rename or decision failed, respect that and keep baseline
  if (!decision || !decision.shouldRename) {
    const keepBaseline: TextUpgradeAnalysisKeepBaseline = {
      status: 'keep-baseline',
      requestId: request.requestId,
      analyzedAt: Date.now(),
      reason: decision?.reason || 'no-decision',
      confidence: decision?.confidence,
      explanation: decision?.explanation,
      baselineFilename: request.baseline.final || request.filename,
      modelSource,
      language: subjectLanguage.language,
      languageConfidence: subjectLanguage.confidence,
      decisionReason: decision?.reason,
    };

    offscreenLogger.log('[TextUpgradeAI] Keeping baseline filename', {
      requestId: request.requestId,
      filename: request.baseline.final,
      hasDecision: !!decision,
      reason: keepBaseline.reason,
      confidence: keepBaseline.confidence,
      explanation: keepBaseline.explanation,
    });
    return keepBaseline;
  }

  offscreenLogger.log('[TextUpgradeAI] Decision: rename needed', {
    requestId: request.requestId,
    reason: decision.reason,
    confidence: decision.confidence,
    explanation: decision.explanation,
    decisionTimeMs: decisionElapsedMs,
  });

  // ===================================================================
  // PHASE 2: Filename Generation (Prompt API call #2)
  // Generate new filename stem based on content
  // ===================================================================
  const generationStartTime = Date.now();
  let generatedStem: string | null = null;

  if (summary && summary.trim().length > 0) {
    generatedStem = await generateFilenameStem({
      summary: summary,
      language: subjectLanguage.language,
      currentBaseline: request.baseline.final || request.filename,
      settings: {
        maxLength: request.settings.maxFilenameLength,
        separator: request.settings.separator,
        transliterateAscii: request.settings.transliterateAscii,
      },
      pageContext: request.pageContext,
    });
  }

  const generationElapsedMs = Date.now() - generationStartTime;

  // Track generation metrics
  if (generatedStem) {
    recordGenerationSuccess(decision.confidence);
    recordPromptPipelineComplete(decisionElapsedMs, generationElapsedMs);
  } else {
    recordGenerationFailure('no-stem-generated');
  }

  // Use AI-generated stem or fallback to baseline extraction
  const subject =
    generatedStem ||
    extractStemFromBaseline(request.baseline.final || request.filename);

  if (!subject || subject.trim().length === 0) {
    offscreenLogger.log('[TextUpgradeAI] No valid subject for filename', {
      requestId: request.requestId,
    });
    return null;
  }

  offscreenLogger.log('[TextUpgradeAI] Filename generation complete', {
    requestId: request.requestId,
    generatedStem,
    usedFallback: !generatedStem,
    generationTimeMs: generationElapsedMs,
  });

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
    return {
      status: 'keep-baseline',
      requestId: request.requestId,
      analyzedAt: Date.now(),
      reason: 'same-as-baseline',
      confidence: decision.confidence,
      explanation: 'Generated filename matches current baseline',
      baselineFilename: currentFinal,
      modelSource,
      language: subjectLanguage.language,
      languageConfidence: subjectLanguage.confidence,
      decisionReason: decision.reason,
    } satisfies TextUpgradeAnalysisKeepBaseline;
  }

  const proposedPath = buildProposedPath(
    request.relativePath,
    proposedFilename,
  );

  const promptUsed = !!generatedStem; // Prompt API used if we generated a stem

  // Determine auto-apply based on decision confidence
  const behavior = getAutoApplyBehavior(decision.confidence);

  const success: TextUpgradeAnalysisSuccess = {
    status: 'success',
    requestId: request.requestId,
    analyzedAt: Date.now(),
    proposal: {
      proposedFilename,
      proposedPath,
      confidenceScore: behavior.confidence,
      autoApply: behavior.shouldAutoApply,
      reasonTags: formatReasonTags(
        subjectLanguage.language,
        promptUsed,
        modelSource,
      ),
      generatedAt: Date.now(),
      source: 'ai',
      summary: buildTextAnalysisSummary(
        subjectLanguage.language,
        summary,
        decision.explanation,
      ),
    },
    language: subjectLanguage.language,
    languageConfidence: subjectLanguage.confidence,
    modelSource,
    truncatedInput: ingestion.truncated,
    promptConfidence: behavior.confidence,
    promptUsed,
    decisionReason: decision.reason,
    metrics: {
      bytesFetched: ingestion.metrics.readBytes,
      requests: 1,
      elapsedMs: ingestion.metrics.elapsedMs,
      promptCalls: 2,
      decisionConfidence: behavior.confidence,
    },
  };

  offscreenLogger.log('[TextUpgradeAI] Proposal created', {
    requestId: request.requestId,
    proposedFilename,
    proposalSummary: success.proposal.summary,
  });

  recordPipelineRouted(modelSource);
  return success;
}

/**
 * Build comprehensive summary for text analysis
 * Combines text summary, language, and decision reasoning for richer context
 *
 * @param language - Detected language of the text
 * @param summary - AI-generated summary of the text content
 * @param decisionExplanation - Optional short explanation of why rename was needed
 * @returns Formatted summary string with all context
 */
function buildTextAnalysisSummary(
  language?: string,
  summary?: string | null,
  decisionExplanation?: string,
): string | undefined {
  const parts: string[] = [];

  // Add language if detected
  if (language) {
    parts.push(`Language: ${language.toUpperCase()}`);
  }

  // Add text summary with label
  if (summary && summary.trim().length > 0) {
    parts.push(`Content: ${summary.trim()}`);
  }

  // Add decision explanation if provided
  if (decisionExplanation && decisionExplanation.trim().length > 0) {
    parts.push(`Decision: ${decisionExplanation.trim()}`);
  }

  return parts.length > 0 ? parts.join('\n\n') : undefined;
}
