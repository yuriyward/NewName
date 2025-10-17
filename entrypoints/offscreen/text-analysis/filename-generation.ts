/**
 * Filename generation module using Chrome's Prompt API.
 * This module generates new filename stems based on content analysis.
 * It only runs AFTER the decision module determines that renaming is needed.
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { Separator } from '@/entrypoints/shared/settings/settings';
import {
  buildBaseContextDescription,
  createPromptSession,
  destroyPromptSession,
  formatPolicyRules,
  parseStructuredResponse,
  truncateForPrompt,
} from './prompt-helpers';

/**
 * Structured response from the generation prompt.
 * This schema is enforced via JSON Schema in the Prompt API call.
 */
export interface FilenameGeneration {
  stem: string; // Main filename without extension
  qualifiers?: string[]; // Optional qualifiers (version, date, etc.)
  confidence: number; // 0.0 to 1.0
  explanation?: string; // Brief explanation of the generated name
}

/**
 * Context information needed to generate a new filename.
 */
export interface FilenameGenerationContext {
  summary: string;
  language?: string;
  currentBaseline: string;
  settings: {
    maxLength: number;
    separator: Separator;
    transliterateAscii: boolean;
  };
}

/**
 * JSON Schema for enforcing structured output from the Prompt API.
 * This ensures the model returns filename components in a consistent format.
 */
const FILENAME_GENERATION_SCHEMA = {
  type: 'object',
  properties: {
    stem: {
      type: 'string',
      minLength: 1,
      maxLength: 60,
      description:
        'Main filename stem without extension. Should be descriptive and based on content summary.',
    },
    qualifiers: {
      type: 'array',
      items: {
        type: 'string',
        maxLength: 20,
      },
      maxItems: 3,
      description:
        'Optional qualifiers like version, date, or category. Keep minimal.',
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description:
        'Confidence in this filename suggestion (0.0 = uncertain, 1.0 = certain)',
    },
    explanation: {
      type: 'string',
      maxLength: 100,
      description: 'Brief explanation of why this filename was chosen',
    },
  },
  required: ['stem', 'confidence'],
} as const;

/**
 * Build the generation prompt that asks the AI to create a new filename.
 * This prompt includes policy rules and examples to guide generation.
 */
function buildGenerationPrompt(context: FilenameGenerationContext): string {
  const baseContext = buildBaseContextDescription({
    filename: context.currentBaseline,
    summary: context.summary,
    language: context.language,
    fileType: 'text', // Context is for text files
  });

  // Truncate summary if too long to avoid token limits
  const summaryForPrompt = truncateForPrompt(context.summary, 800);

  const policyRules = formatPolicyRules(context.settings);

  const separatorExample =
    context.settings.separator === 'clean'
      ? 'Budget Meeting Notes'
      : context.settings.separator === 'kebab'
        ? 'budget-meeting-notes'
        : 'budget_meeting_notes';

  return `Generate a descriptive filename based on this content:

${baseContext}

Content summary:
${summaryForPrompt}

**Rules:**
${policyRules}

**Guidelines:**
- Focus on main topic from summary (3-6 words ideal)
- Use human-readable names, avoid technical jargon
- NO file extension in stem
- Add qualifiers only if meaningful (version, category)

**Examples:**
- "Meeting notes discussing Q1 budget allocation" → "${separatorExample}"
- "API documentation for authentication endpoints" → "API Authentication Docs"

Respond with JSON: {"stem": "...", "confidence": 0.0-1.0, "explanation": "..."}`;
}

/**
 * Validate that the generation response has required fields and correct types.
 * This adds runtime validation on top of the JSON schema constraint.
 */
function validateGenerationResponse(
  generation: FilenameGeneration,
): generation is FilenameGeneration {
  if (
    typeof generation.stem !== 'string' ||
    generation.stem.trim().length === 0
  ) {
    debugLogger.warn('[FilenameGeneration] Invalid stem', {
      stem: generation.stem,
    });
    return false;
  }

  if (generation.stem.length > 60) {
    debugLogger.warn('[FilenameGeneration] Stem too long', {
      length: generation.stem.length,
    });
    return false;
  }

  if (
    typeof generation.confidence !== 'number' ||
    generation.confidence < 0 ||
    generation.confidence > 1
  ) {
    debugLogger.warn('[FilenameGeneration] Invalid confidence', {
      confidence: generation.confidence,
    });
    return false;
  }

  if (generation.qualifiers !== undefined) {
    if (!Array.isArray(generation.qualifiers)) {
      debugLogger.warn('[FilenameGeneration] Qualifiers not an array', {
        type: typeof generation.qualifiers,
      });
      return false;
    }

    if (generation.qualifiers.length > 3) {
      debugLogger.warn('[FilenameGeneration] Too many qualifiers', {
        count: generation.qualifiers.length,
      });
      return false;
    }

    for (const qualifier of generation.qualifiers) {
      if (typeof qualifier !== 'string' || qualifier.length > 20) {
        debugLogger.warn('[FilenameGeneration] Invalid qualifier', {
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
    debugLogger.warn('[FilenameGeneration] Invalid explanation type', {
      type: typeof generation.explanation,
    });
    return false;
  }

  return true;
}

/**
 * System prompt that establishes the AI's role as a filename generator.
 * This is separate from the per-request prompt and sets the overall context.
 */
const GENERATION_SYSTEM_PROMPT = `You are a professional filename generator. Your job is to create clear, descriptive filenames based on file content.

Follow these principles:
- Clarity: Names should immediately convey what the file contains
- Brevity: Keep names concise while maintaining meaning (3-6 words ideal)
- Consistency: Follow the user's formatting preferences
- Practicality: Create names that work well in file systems and searches
- Relevance: Focus on the main topic, not minor details

Avoid:
- Technical jargon unless the content is technical
- Redundant words that don't add meaning
- File extensions in the stem (they're added separately)
- Special characters that might cause issues
- Overly generic terms like "document" or "file"

Always respond with valid JSON matching the provided schema.`;

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
  console.log('[FilenameGeneration] Starting generation', {
    summaryLength: context.summary.length,
    language: context.language,
    baseline: context.currentBaseline,
    maxLength: context.settings.maxLength,
  });

  try {
    // Generate the complete filename object (stem + qualifiers)
    const generation = await generateFilenameComplete(context);

    if (!generation) {
      console.log('[FilenameGeneration] Failed to generate complete filename');
      return null;
    }

    // Return the generated stem (qualifiers are generated but not exposed in this
    // function; use generateFilenameComplete() if qualifiers are needed).
    // The stem is typically passed to buildFilename() which applies naming policies.
    const trimmedStem = generation.stem.trim();

    console.log('[FilenameGeneration] Generation successful', {
      stem: trimmedStem,
      qualifiers: generation.qualifiers,
      confidence: generation.confidence,
      explanation: generation.explanation,
    });

    return trimmedStem;
  } catch (error) {
    debugLogger.warn('[FilenameGeneration] Generation failed', {
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
 */
export async function generateFilenameComplete(
  context: FilenameGenerationContext,
): Promise<FilenameGeneration | null> {
  console.log('[FilenameGeneration] Starting complete generation', {
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

    const prompt = buildGenerationPrompt(context);
    const response = await session.prompt(prompt, {
      responseConstraint: FILENAME_GENERATION_SCHEMA,
      omitResponseConstraintInput: true,
    });

    // Log token usage for debugging
    console.log('[FilenameGeneration] Token usage after prompt', {
      inputUsage: session.inputUsage,
      inputQuota: session.inputQuota,
      percentUsed:
        session.inputUsage && session.inputQuota
          ? `${((session.inputUsage / session.inputQuota) * 100).toFixed(1)}%`
          : 'unknown',
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
    debugLogger.warn('[FilenameGeneration] Complete generation failed', {
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
 */
export function isHighConfidenceGeneration(
  generation: FilenameGeneration,
): boolean {
  return generation.confidence >= 0.8;
}
