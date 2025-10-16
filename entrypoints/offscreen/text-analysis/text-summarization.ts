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
 * Fallback summary: extract first non-empty line, truncate to 160 chars
 */
function fallbackSummary(text: string): string | null {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return null;
  }
  const first = lines[0];
  if (first.length <= 160) {
    return first;
  }
  return `${first.slice(0, 157).trimEnd()}…`;
}

/**
 * Generate a summary of text using Chrome's built-in Summarizer API.
 * Falls back to first line extraction if API unavailable.
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
    return fallbackSummary(text);
  }

  let summarizer: ChromeSummarizerInstance | null = null;
  try {
    // Check availability with output language specification
    const availability = await SummarizerCtor.availability?.({
      outputLanguage: 'en',
    });

    console.log('[Summarizer] Availability check', {
      availability,
      hasAvailability: availability !== null && availability !== undefined,
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
      console.log('[Summarizer] API unavailable, using fallback', {
        availability,
      });
      console.log('[TextUpgradeAI] Summarizer unavailable, using fallback');
      return fallbackSummary(text);
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

    const sample = text.length > 20_000 ? text.slice(0, 20_000) : text;

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

        // If input exceeds quota, try with smaller sample
        if (inputUsage > inputQuota) {
          debugLogger.warn(
            '[TextUpgradeAI] Input exceeds quota, using fallback',
          );
          return fallbackSummary(text);
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
      samplePreview: sample.slice(0, 100),
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

    // Return the AI summary if available, otherwise fallback
    const trimmed = summary?.trim();
    if (trimmed && trimmed.length > 0) {
      return trimmed;
    }
    return fallbackSummary(text);
  } catch (error) {
    debugLogger.warn('[TextUpgradeAI] Summarizer failed', { error });
    return fallbackSummary(text);
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
