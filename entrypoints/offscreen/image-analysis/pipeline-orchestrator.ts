/**
 * Image upgrade pipeline orchestrator
 * Coordinates image analysis: ingestion → description → decision → filename generation
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  HIGH_CONFIDENCE_AUTO_APPLY_THRESHOLD,
  HIGH_CONFIDENCE_DISPLAY_THRESHOLD,
} from '@/entrypoints/shared/integrations/image-analysis/constants';
import type {
  ImageIngestionResult,
  ImageUpgradeAnalysisRequest,
  ImageUpgradeAnalysisResponse,
  ImageUpgradeAnalysisSuccess,
  ImageUpgradeAnalysisUnavailable,
} from '@/entrypoints/shared/integrations/image-analysis/types';
import type {
  TextUpgradeAnalysisRequest,
  TextUpgradeIngestionResult,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import { ensureAiModelsReadyRemote } from '@/entrypoints/shared/messaging/extension-messaging';
import {
  buildFilename,
  buildProposalSummary,
  buildProposedPath,
  extractStemFromBaseline,
  formatReasonTags,
} from '../text-analysis/filename-builder';
import { generateFilenameStem } from '../text-analysis/filename-generation';
import { describeImage } from './image-description';
import { decideIfImageNeedsRename } from './image-rename-decision';

/**
 * Build user-friendly instructions for enabling multimodal AI support.
 * Note: The flag MUST be set to "Enabled", not "Default" - these are different states.
 */
function buildMultimodalSetupInstructions(): string {
  return (
    `Chrome's multimodal AI (image analysis) is not enabled yet.\n\n` +
    `⚠️  IMPORTANT: Flag must be set to "Enabled" (NOT "Default")\n` +
    `"Default" state does NOT enable multimodal support.\n\n` +
    `To enable multimodal AI:\n` +
    `1. Open chrome://flags in a new tab\n` +
    `2. Search for "prompt-api-for-gemini-nano-multimodal-input"\n` +
    `3. Click the dropdown menu and select "Enabled"\n` +
    `   (Make sure it says "Enabled", not "Default")\n` +
    `4. Click "Relaunch" to restart Chrome\n` +
    `5. Wait for Gemini Nano to download (check chrome://components)\n\n` +
    `Requirements:\n` +
    `- Chrome 138+ (Canary/Dev channel)\n` +
    `- 22GB+ available storage\n\n` +
    `Troubleshooting:\n` +
    `- Ensure you selected "Enabled" in the dropdown (not "Default")\n` +
    `- Check chrome://components for "Optimization Guide On Device Model"\n` +
    `- Restart Chrome completely after changing the flag\n` +
    `- If still unavailable, you may need Early Preview Program enrollment`
  );
}

/**
 * Run the complete image upgrade analysis pipeline
 * Returns upgrade proposal or null if filename should not be changed
 *
 * @param request - Image upgrade analysis request
 * @param ingestion - Ingestion result with PNG blob and metadata
 * @returns Analysis response or null
 */
export async function runImageUpgradePipeline(
  request: ImageUpgradeAnalysisRequest,
  ingestion: ImageIngestionResult,
): Promise<ImageUpgradeAnalysisResponse | null> {
  const mode = request.settings.mode ?? 'on-device-only';

  if (mode === 'off') {
    return null;
  }

  // Ensure multimodal Prompt API is available and ready
  // Note: This requires Chrome 138+ with the experimental flag enabled
  // chrome://flags/#prompt-api-for-gemini-nano-multimodal-input
  let modelReady = true;

  try {
    console.log(
      '[ImageUpgradeAI] Checking multimodal Prompt API availability',
      {
        requestId: request.requestId,
      },
    );

    // Request multimodal model availability check from background context
    // The model-status infrastructure handles availability checking and caching
    const modelStatuses = await ensureAiModelsReadyRemote({
      ids: ['language-model'],
      languageModel: {
        // Request multimodal support: image + text input, text output
        expectedInputs: [{ type: 'image' }, { type: 'text' }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
      },
    });

    const languageModelStatus = modelStatuses['language-model'];
    console.log('[ImageUpgradeAI] Language model status', {
      state: languageModelStatus?.state,
      availability: languageModelStatus?.availability,
      reason: languageModelStatus?.detail,
    });

    // Check if model is available
    if (languageModelStatus?.state !== 'available') {
      modelReady = false;
      const message =
        languageModelStatus?.availability === 'no' ||
        languageModelStatus?.availability === 'unavailable'
          ? buildMultimodalSetupInstructions()
          : `Chrome's Prompt API is not available on this device. ` +
            `Status: ${languageModelStatus?.state ?? 'unknown'}`;

      debugLogger.warn('[ImageUpgradeAI] Prompt API not available', {
        requestId: request.requestId,
        status: languageModelStatus?.state,
        availability: languageModelStatus?.availability,
        detail: languageModelStatus?.detail,
      });

      return {
        status: 'unavailable',
        requestId: request.requestId,
        analyzedAt: Date.now(),
        reason: 'multimodal-unsupported',
        message,
      } satisfies ImageUpgradeAnalysisUnavailable;
    }
  } catch (error) {
    modelReady = false;
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to check API availability';

    debugLogger.warn('[ImageUpgradeAI] Model availability check failed', {
      requestId: request.requestId,
      error,
    });

    if (mode === 'on-device-only') {
      return {
        status: 'unavailable',
        requestId: request.requestId,
        analyzedAt: Date.now(),
        reason: 'api-unavailable',
        message,
      } satisfies ImageUpgradeAnalysisUnavailable;
    }
  }

  if (!modelReady) {
    return null;
  }

  console.log('[ImageUpgradeAI] Multimodal API ready', {
    requestId: request.requestId,
    imageSize: `${ingestion.originalWidth}x${ingestion.originalHeight}`,
    resizedSize: `${ingestion.resizedWidth}x${ingestion.resizedHeight}`,
  });

  // ==================================================================
  // PHASE 1: Describe Image (Prompt API call #1)
  // Generate concise description of image content
  // ==================================================================
  const descriptionStartTime = Date.now();
  const description = await describeImage(ingestion.blob);
  const descriptionElapsedMs = Date.now() - descriptionStartTime;

  if (!description) {
    // Session creation failed despite availability check passing
    // This usually means the Chrome flag is set to "Default" instead of "Enabled"
    const message =
      `Image analysis failed: multimodal session creation did not work.\n\n` +
      `This often happens when the Chrome flag is set to "Default" instead of "Enabled".\n\n` +
      buildMultimodalSetupInstructions();

    debugLogger.warn('[ImageUpgradeAI] Image description failed', {
      requestId: request.requestId,
      message,
    });

    return {
      status: 'unavailable',
      requestId: request.requestId,
      analyzedAt: Date.now(),
      reason: 'multimodal-unsupported',
      message,
    } satisfies ImageUpgradeAnalysisUnavailable;
  }

  console.log('[ImageUpgradeAI] Image description complete', {
    requestId: request.requestId,
    description: description.description,
    confidence: description.confidence.toFixed(2),
    elapsedMs: descriptionElapsedMs,
  });

  // ==================================================================
  // PHASE 2: Rename Decision (Prompt API call #2)
  // Decide if filename needs improvement
  // ==================================================================
  const decisionStartTime = Date.now();
  const decision = await decideIfImageNeedsRename({
    currentFilename: request.baseline.final || request.filename,
    description: description.description,
    fileType: request.fileType,
  });
  const decisionElapsedMs = Date.now() - decisionStartTime;

  if (!decision || !decision.shouldRename) {
    console.log('[ImageUpgradeAI] Keeping baseline filename', {
      requestId: request.requestId,
      filename: request.baseline.final,
      reason: decision?.reason || 'no-decision',
    });
    return null; // No upgrade needed
  }

  console.log('[ImageUpgradeAI] Decision: rename needed', {
    requestId: request.requestId,
    reason: decision.reason,
    confidence: decision.confidence.toFixed(2),
  });

  // ==================================================================
  // PHASE 3: Filename Generation (Prompt API call #3)
  // Generate new filename stem based on description
  // For PDFs, include the extracted title context to prioritize it
  // ==================================================================
  const generationStartTime = Date.now();

  // Extract PDF context if available (passed through request)
  // biome-ignore lint/suspicious/noExplicitAny: PDF context passed through request object
  const pdfContext = (request as any)._pdfContext;

  const generatedStem = await generateFilenameStem({
    summary: description.description,
    language: 'en', // Images described in English
    currentBaseline: request.baseline.final || request.filename,
    settings: {
      maxLength: request.settings.maxFilenameLength,
      separator: request.settings.separator,
      transliterateAscii: request.settings.transliterateAscii,
    },
    // Pass PDF context if available
    ...(pdfContext && {
      pdfContext: {
        source: 'pdf' as const,
        documentTitle: pdfContext.documentTitle,
        shouldPrioritizeTitle: pdfContext.shouldPrioritizeTitle,
      },
    }),
  });
  const generationElapsedMs = Date.now() - generationStartTime;

  // Use generated stem or fallback to baseline extraction
  const subject =
    generatedStem ||
    extractStemFromBaseline(request.baseline.final || request.filename);

  if (!subject || subject.trim().length === 0) {
    console.log('[ImageUpgradeAI] No valid subject for filename', {
      requestId: request.requestId,
    });
    return null;
  }

  console.log('[ImageUpgradeAI] Filename generation complete', {
    requestId: request.requestId,
    generatedStem,
    usedFallback: !generatedStem,
    elapsedMs: generationElapsedMs,
  });

  // ==================================================================
  // Build Proposal
  // ==================================================================
  // Create a compatible request object for buildFilename
  // (it only needs specific fields from the request and doesn't use ingestion)
  const requestForFilename: TextUpgradeAnalysisRequest = {
    requestId: request.requestId,
    historyId: request.historyId,
    downloadId: request.downloadId,
    url: request.url,
    filename: request.filename,
    relativePath: request.relativePath,
    mimeType: request.mimeType,
    sizeBytes: request.sizeBytes,
    fileType: request.fileType,
    baseline: request.baseline,
    settings: {
      languagePreference: 'auto',
      mode: request.settings.mode,
      maxBytes: request.settings.maxBytes,
      maxFilenameLength: request.settings.maxFilenameLength,
      separator: request.settings.separator,
      transliterateAscii: request.settings.transliterateAscii,
    },
  };

  const ingestionForFilename: TextUpgradeIngestionResult = {
    status: 'ingested',
    requestId: request.requestId,
    analyzedAt: ingestion.analyzedAt,
    text: description.description,
    encoding: 'utf-8',
    originalLength: description.description.length,
    truncated: false,
    sizeBytes: ingestion.originalSizeBytes,
    metrics: {
      readBytes: ingestion.metrics.readBytes,
      elapsedMs: ingestion.metrics.elapsedMs,
    },
  };

  const filenameResult = buildFilename({
    request: requestForFilename,
    ingestion: ingestionForFilename,
    subject,
    language: undefined,
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
    return null; // No change needed
  }

  const proposedPath = buildProposedPath(
    request.relativePath,
    proposedFilename,
  );

  const promptUsed = !!generatedStem;
  const shouldAutoApply =
    decision.confidence >= HIGH_CONFIDENCE_AUTO_APPLY_THRESHOLD;

  const success: ImageUpgradeAnalysisSuccess = {
    status: 'success',
    requestId: request.requestId,
    analyzedAt: Date.now(),
    proposal: {
      proposedFilename,
      proposedPath,
      confidence:
        decision.confidence >= HIGH_CONFIDENCE_DISPLAY_THRESHOLD
          ? 'high'
          : 'suggested',
      autoApply: shouldAutoApply,
      reasonTags: formatReasonTags(undefined, promptUsed, 'on-device'),
      generatedAt: Date.now(),
      source: 'ai',
      summary:
        decision.explanation ||
        buildProposalSummary(undefined, description.description),
    },
    description: description.description,
    modelSource: 'on-device',
    promptConfidence: decision.confidence,
    promptUsed,
    decisionReason: decision.reason,
    metrics: {
      bytesFetched: ingestion.metrics.readBytes,
      requests: 1,
      elapsedMs: ingestion.metrics.elapsedMs,
      promptCalls: 3, // Describe + decision + generation
      decisionConfidence: decision.confidence,
      resizeRatio: ingestion.resizeRatio,
      originalWidth: ingestion.originalWidth,
      originalHeight: ingestion.originalHeight,
      resizedWidth: ingestion.resizedWidth,
      resizedHeight: ingestion.resizedHeight,
    },
  };

  console.log('[ImageUpgradeAI] Proposal created', {
    requestId: request.requestId,
    proposedFilename,
    proposalSummary: success.proposal.summary,
    totalElapsedMs:
      descriptionElapsedMs + decisionElapsedMs + generationElapsedMs,
  });

  return success;
}
