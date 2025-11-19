/**
 * Filename generation module using Chrome's Prompt API.
 * This module generates new filename stems based on content analysis.
 * It only runs AFTER the decision module determines that renaming is needed.
 *
 * SECURITY: All untrusted inputs (page context, summary) are sanitized via shared utilities.
 */

import { SILENT_RENAME_THRESHOLD } from '@/entrypoints/shared/constants/confidence-thresholds';
import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import {
  buildGenerationPrompt,
  GENERATION_SYSTEM_PROMPT,
} from './filename-generation-prompts';
import type {
  FilenameGeneration,
  FilenameGenerationContext,
} from './filename-generation-types';
import { FILENAME_GENERATION_SCHEMA } from './filename-generation-types';
import { validateGenerationResponse } from './filename-generation-validator';
import {
  createPromptSession,
  destroyPromptSession,
  parseStructuredResponse,
} from './prompt-helpers';

/**
 * Main function to generate a new filename stem using Prompt API.
 * This should only be called after the decision module has determined
 * that renaming is needed.
 *
 * @param context - Information about the file content and preferences
 * @returns Generated filename stem or null if generation failed
 */
export async function generateFilenameStem(
  context: FilenameGenerationContext,
): Promise<string | null> {
  offscreenLogger.log('[FilenameGeneration] Starting generation', {
    summaryLength: context.summary.length,
    language: context.language,
    baseline: context.currentBaseline,
    maxLength: context.settings.maxLength,
  });

  try {
    // Generate the complete filename object (stem + qualifiers)
    const generation = await generateFilenameComplete(context);

    if (!generation) {
      offscreenLogger.log(
        '[FilenameGeneration] Failed to generate complete filename',
      );
      return null;
    }

    // Return the generated stem (qualifiers are generated but not exposed in this
    // function; use generateFilenameComplete() if qualifiers are needed).
    // The stem is typically passed to buildFilename() which applies naming policies.
    const trimmedStem = generation.stem.trim();

    offscreenLogger.log('[FilenameGeneration] Generation successful', {
      stem: trimmedStem,
      qualifiers: generation.qualifiers,
      confidence: generation.confidence,
      explanation: generation.explanation,
    });

    return trimmedStem;
  } catch (error) {
    offscreenLogger.warn('[FilenameGeneration] Generation failed', {
      error,
      baseline: context.currentBaseline,
    });
    return null;
  }
}

/**
 * Generate full filename object with qualifiers.
 * This is an alternative to generateFilenameStem that returns the complete
 * generation result including qualifiers.
 *
 * @param context - Filename generation context with settings and content
 * @returns Complete filename generation or null if failed
 */
export async function generateFilenameComplete(
  context: FilenameGenerationContext,
): Promise<FilenameGeneration | null> {
  offscreenLogger.log('[FilenameGeneration] Starting complete generation', {
    summaryLength: context.summary.length,
    language: context.language,
  });

  let session: Awaited<ReturnType<typeof createPromptSession>> = null;

  try {
    session = await createPromptSession({
      temperature: 0.4,
      topK: 20,
      systemPrompt: GENERATION_SYSTEM_PROMPT,
      outputLanguage: 'en',
    });

    if (!session) {
      return null;
    }

    offscreenLogger.log(
      '[FilenameGeneration] Session created - initial usage',
      {
        inputUsage: session.inputUsage,
        inputQuota: session.inputQuota,
      },
    );

    const prompt = buildGenerationPrompt(context);
    offscreenLogger.log('[FilenameGeneration] Sending generation request', {
      baseline: context.currentBaseline,
      summaryLength: context.summary.length,
    });
    const response = await session.prompt(prompt, {
      responseConstraint: FILENAME_GENERATION_SCHEMA,
      omitResponseConstraintInput: true,
    });

    // Log token usage for debugging
    offscreenLogger.log('[FilenameGeneration] Token usage after prompt', {
      inputUsage: session.inputUsage,
      inputQuota: session.inputQuota,
      percentUsed:
        session.inputUsage && session.inputQuota
          ? `${((session.inputUsage / session.inputQuota) * 100).toFixed(1)}%`
          : 'unknown',
      session: session,
    });

    const generation = parseStructuredResponse<FilenameGeneration>(
      response,
      'filename-generation',
    );

    if (!generation || !validateGenerationResponse(generation)) {
      return null;
    }

    return generation;
  } catch (error) {
    offscreenLogger.warn('[FilenameGeneration] Complete generation failed', {
      error,
    });
    return null;
  } finally {
    if (session) {
      destroyPromptSession(session);
    }
  }
}

/**
 * Helper to determine if a generation has high confidence.
 * Used to decide whether to auto-apply or show confirmation.
 *
 * @param generation - The generated filename to check
 * @returns True if confidence meets or exceeds the silent rename threshold
 */
export function isHighConfidenceGeneration(
  generation: FilenameGeneration,
): boolean {
  return generation.confidence >= SILENT_RENAME_THRESHOLD;
}
