/**
 * Multimodal AI model availability checking
 * Handles Prompt API readiness verification for image analysis
 */

import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import {
  buildSessionCreationFailureMessage,
  MULTIMODAL_SETUP_INSTRUCTIONS,
} from '@/entrypoints/shared/integrations/image-analysis/constants';
import type { ImageUpgradeAnalysisUnavailable } from '@/entrypoints/shared/integrations/image-analysis/types';
import { ensureAiModelsReadyRemote } from '@/entrypoints/shared/messaging/text-messages';

/**
 * Check if multimodal Prompt API is available and ready
 * Requires Chrome 138+ with experimental flag enabled
 *
 * @param requestId - Request identifier for logging
 * @returns Unavailability response if not ready, or null if available
 */
export async function checkMultimodalAvailability(
  requestId: string,
): Promise<ImageUpgradeAnalysisUnavailable | null> {
  try {
    offscreenLogger.log(
      '[ImageUpgradeAI] Checking multimodal Prompt API availability',
      {
        requestId,
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
    offscreenLogger.log('[ImageUpgradeAI] Language model status', {
      state: languageModelStatus?.state,
      availability: languageModelStatus?.availability,
      reason: languageModelStatus?.detail,
    });

    // Check if model is available
    if (languageModelStatus?.state !== 'available') {
      const message =
        languageModelStatus?.availability === 'no' ||
        languageModelStatus?.availability === 'unavailable'
          ? MULTIMODAL_SETUP_INSTRUCTIONS
          : `Chrome's Prompt API is not available on this device. ` +
            `Status: ${languageModelStatus?.state ?? 'unknown'}`;

      offscreenLogger.warn('[ImageUpgradeAI] Prompt API not available', {
        requestId,
        status: languageModelStatus?.state,
        availability: languageModelStatus?.availability,
        detail: languageModelStatus?.detail,
      });

      return {
        status: 'unavailable',
        requestId,
        analyzedAt: Date.now(),
        reason: 'multimodal-unsupported',
        message,
      };
    }

    return null; // Available
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to check API availability';

    offscreenLogger.warn('[ImageUpgradeAI] Model availability check failed', {
      requestId,
      error,
    });

    return {
      status: 'unavailable',
      requestId,
      analyzedAt: Date.now(),
      reason: 'api-unavailable',
      message,
    };
  }
}

/**
 * Build unavailability response when session creation fails
 * Usually indicates the Chrome flag is set to "Default" instead of "Enabled"
 */
export function buildSessionCreationFailureResponse(
  requestId: string,
): ImageUpgradeAnalysisUnavailable {
  const message = buildSessionCreationFailureMessage();

  offscreenLogger.warn('[ImageUpgradeAI] Image description failed', {
    requestId,
    message,
  });

  return {
    status: 'unavailable',
    requestId,
    analyzedAt: Date.now(),
    reason: 'multimodal-unsupported',
    message,
  };
}
