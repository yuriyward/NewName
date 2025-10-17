/**
 * Note: This file uses console.log() instead of debugLogger.log() for operational logs.
 * Reason: Offscreen documents don't have storage access, so debugLogger.setEnabled()
 * fails. AI processing logs are diagnostic/operational and should always be visible.
 * We still use debugLogger.warn() and debugLogger.error() for warnings/errors.
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type {
  ChromeSummarizerConstructor,
  ChromeSummarizerInstance,
  ChromeSummarizerOptions,
} from '@/entrypoints/shared/integrations/chrome-ai/types';
import { PREVIEW_LOG_LENGTH, SUMMARIZATION_SAMPLE_SIZE } from './constants';

/**
 * Resolve Summarizer constructor from Chrome's global scope.
 * Chrome exposes AI APIs in multiple locations during API transition.
 */
function resolveSummarizerCtor(): ChromeSummarizerConstructor | null {
  const globalScope = globalThis as typeof globalThis & {
    Summarizer?: ChromeSummarizerConstructor;
    ai?: { summarizer?: ChromeSummarizerConstructor };
  };

  // Check both locations (Chrome team exposes APIs in two places during transition)
  if (globalScope.Summarizer?.create) {
    return globalScope.Summarizer;
  }
  if (globalScope.ai?.summarizer?.create) {
    return globalScope.ai.summarizer;
  }
  return null;
}

/**
 * Generate a summary of text using Chrome's built-in Summarizer API.
 * Returns null if the API is unavailable or fails.
 */
export async function summarizeText(
  text: string,
  language?: string,
): Promise<string | null> {
  const SummarizerCtor = resolveSummarizerCtor();

  if (!SummarizerCtor?.create) {
    console.log('[TextUpgradeAI] Summarizer API not available', {
      hasGlobal: !!SummarizerCtor,
      hasCreate: !!SummarizerCtor?.create,
    });
    return null;
  }

  let summarizer: ChromeSummarizerInstance | null = null;
  try {
    // Check availability with output language specification
    const availability = await SummarizerCtor.availability?.({
      outputLanguage: 'en',
    });

    console.log('[Summarizer] Availability check', {
      availability,
      hasAvailability: !!availability,
      detectedLanguage: language,
    });

    console.log('[TextUpgradeAI] Summarizer availability', {
      availability,
      detectedLanguage: language,
    });

    // Check for explicit unavailability
    // Accept: 'available', 'readily', 'downloadable', 'after-download'
    // Reject: null, undefined, 'no', 'unavailable'
    if (
      !availability ||
      availability === 'no' ||
      availability === 'unavailable'
    ) {
      console.log('[Summarizer] API unavailable', {
        availability,
      });
      console.log('[TextUpgradeAI] Summarizer unavailable');
      return null;
    }

    // Create summarizer with supported options per Chrome docs
    // Chrome warning requires outputLanguage to be specified for optimal quality
    // Supported output languages: en, es, ja
    // Key-points are intermediate analysis data, always output in English
    const createOptions: ChromeSummarizerOptions = {
      type: 'key-points',
      format: 'markdown',
      length: 'short',
      outputLanguage: 'en',
    };

    // Optionally hint the input language via sharedContext if detected
    if (language && language.trim().length > 0) {
      createOptions.sharedContext = `Content language: ${language}`;
    }

    console.log('[Summarizer] Creating with options', createOptions);
    summarizer = await SummarizerCtor.create(createOptions);

    const sample =
      text.length > SUMMARIZATION_SAMPLE_SIZE
        ? text.slice(0, SUMMARIZATION_SAMPLE_SIZE)
        : text;

    // Check input usage against quota if available
    let inputUsage: number | undefined;
    let inputQuota: number | undefined;
    if (summarizer.measureInputUsage && summarizer.inputQuota) {
      try {
        inputUsage = await summarizer.measureInputUsage(sample);
        inputQuota = summarizer.inputQuota;

        console.log('[Summarizer] Input usage check', {
          inputUsage,
          inputQuota,
          percentUsed: `${((inputUsage / inputQuota) * 100).toFixed(1)}%`,
        });

        // If input exceeds quota, return null
        if (inputUsage > inputQuota) {
          debugLogger.warn('[TextUpgradeAI] Input exceeds quota');
          return null;
        }
      } catch (usageError) {
        console.log('[TextUpgradeAI] Input usage check failed', {
          usageError,
        });
        // Continue anyway - not critical
      }
    }

    console.log('[Summarizer] Summarizing sample', {
      sampleLength: sample.length,
      samplePreview: sample.slice(0, PREVIEW_LOG_LENGTH),
      language,
      inputUsage,
      inputQuota,
    });

    // Summarize with explicit outputLanguage (Chrome requires it for proper attestation)
    // Chrome's Summarizer API returns the summary directly as a string
    const summary = await summarizer.summarize(sample, {
      outputLanguage: 'en',
    });

    console.log('[Summarizer] Generated summary', {
      inputLength: sample.length,
      summaryLength: summary?.length ?? 0,
      language,
      summary: summary,
    });

    // Return the AI summary if available
    const trimmed = summary?.trim();
    if (trimmed && trimmed.length > 0) {
      return trimmed;
    }
    return null;
  } catch (error) {
    debugLogger.warn('[TextUpgradeAI] Summarizer failed', { error });
    return null;
  } finally {
    // CRITICAL: Always destroy to prevent memory leaks
    if (summarizer) {
      try {
        summarizer.destroy?.();
      } catch (cleanupError) {
        console.log('[TextUpgradeAI] Summarizer cleanup failed', {
          cleanupError,
        });
      }
    }
  }
}
