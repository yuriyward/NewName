/**
 * Validation logic for filename generation responses.
 * Ensures generated filenames meet structural and quality requirements.
 */

import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import type { FilenameGeneration } from './filename-generation-types';

/**
 * Validate that the generation response has required fields and correct types.
 * This adds runtime validation on top of the JSON schema constraint.
 *
 * @param generation - The generation response to validate
 * @returns True if valid, false otherwise
 */
export function validateGenerationResponse(
  generation: FilenameGeneration,
): generation is FilenameGeneration {
  if (
    typeof generation.stem !== 'string' ||
    generation.stem.trim().length === 0
  ) {
    offscreenLogger.warn('[FilenameGeneration] Invalid stem', {
      stem: generation.stem,
    });
    return false;
  }

  if (generation.stem.length > 60) {
    offscreenLogger.warn('[FilenameGeneration] Stem too long', {
      length: generation.stem.length,
    });
    return false;
  }

  if (
    typeof generation.confidence !== 'number' ||
    generation.confidence < 0 ||
    generation.confidence > 1
  ) {
    offscreenLogger.warn('[FilenameGeneration] Invalid confidence', {
      confidence: generation.confidence,
    });
    return false;
  }

  if (generation.qualifiers !== undefined) {
    if (!Array.isArray(generation.qualifiers)) {
      offscreenLogger.warn('[FilenameGeneration] Qualifiers not an array', {
        type: typeof generation.qualifiers,
      });
      return false;
    }

    if (generation.qualifiers.length > 3) {
      offscreenLogger.warn('[FilenameGeneration] Too many qualifiers', {
        count: generation.qualifiers.length,
      });
      return false;
    }

    for (const qualifier of generation.qualifiers) {
      if (typeof qualifier !== 'string' || qualifier.length > 20) {
        offscreenLogger.warn('[FilenameGeneration] Invalid qualifier', {
          qualifier,
        });
        return false;
      }
    }
  }

  if (
    generation.explanation !== undefined &&
    typeof generation.explanation !== 'string'
  ) {
    offscreenLogger.warn('[FilenameGeneration] Invalid explanation type', {
      type: typeof generation.explanation,
    });
    return false;
  }

  return true;
}
