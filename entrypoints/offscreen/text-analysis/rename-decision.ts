/**
 * Rename decision module using Chrome's Prompt API.
 * This module decides whether a filename needs renaming by analyzing its quality
 * against the file content. It uses a separate JSON schema focused purely on
 * the decision logic, independent of filename generation.
 *
 * SECURITY: All untrusted inputs (filenames) are sanitized to prevent prompt injection.
 */

import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import { sanitizeForPrompt } from '@/entrypoints/shared/utils/prompt-sanitization';
import {
  buildBaseContextDescription,
  createPromptSession,
  destroyPromptSession,
  parseStructuredResponse,
} from './prompt-helpers';
import { DECISION_SYSTEM_PROMPT } from './rename-decision-prompts';
import type {
  RenameDecision,
  RenameDecisionContext,
} from './rename-decision-types';
import { validateDecisionResponse } from './rename-decision-validation';

/**
 * JSON Schema for enforcing structured output from the Prompt API.
 * This ensures the model returns a consistent, parseable format.
 */
const RENAME_DECISION_SCHEMA = {
  type: 'object',
  properties: {
    shouldRename: {
      type: 'boolean',
      description: 'Whether the file needs renaming based on quality analysis',
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description:
        'Confidence in this decision (0.0 = uncertain, 1.0 = certain)',
    },
    reason: {
      type: 'string',
      enum: [
        'generic-name',
        'meaningless-hash',
        'already-descriptive',
        'contains-topic',
        'timestamp-only',
        'poor-formatting',
      ],
      description: 'Category explaining the decision',
    },
    explanation: {
      type: 'string',
      maxLength: 150,
      description: 'Brief explanation of the decision reasoning',
    },
  },
  required: ['shouldRename', 'confidence', 'reason'],
} as const;

/**
 * Build the decision prompt that asks the AI to analyze filename quality.
 * This prompt focuses on conservative decision-making - only suggesting
 * renames for truly poor filenames.
 */
function buildDecisionPrompt(context: RenameDecisionContext): string {
  const baseContext = buildBaseContextDescription({
    filename: context.currentFilename,
    summary: context.summary,
    language: context.language,
    fileType: context.fileType,
    pageContext: context.pageContext,
  });

  // Sanitize and escape the original name to prevent injection/quote breakout
  const sanitizedOriginalName = sanitizeForPrompt(context.originalName);
  const escapedOriginalName = sanitizedOriginalName.replace(/"/g, '\\"');

  return `Analyze this filename and decide if it needs renaming:

${baseContext}

Original download name: "${escapedOriginalName}"

Consider these criteria carefully:

**Reasons to RENAME (shouldRename: true):**
1. Generic names: "document", "file", "download", "untitled", "new file"
2. Meaningless hashes or UUIDs: Random alphanumeric strings without meaning
3. Timestamp-only names: Just dates and numbers like "2024-01-15" or "IMG_1234"
4. Poor formatting: ALL_CAPS, NoSeparators, random-MiX, excessive-dashes-or-underscores

**Reasons to KEEP (shouldRename: false):**
1. Already descriptive: Contains clear topic or purpose
2. Contains relevant keywords: Has words from the content summary
3. Well-formatted: Proper capitalization and separators
4. Professional naming: Follows good filename conventions

**Decision Guidelines:**
- Be CONSERVATIVE: Only suggest renaming for clearly poor filenames
- If in doubt, KEEP the existing name
- Match the "reason" field to the most appropriate category
- Set "confidence" based on how certain you are (0.0-1.0)
- Provide a brief "explanation" of your reasoning

Make your decision and respond with JSON only.`;
}

/**
 * Main function to decide if a filename should be renamed.
 * Makes a Prompt API call with structured output constraint and returns
 * the decision or null if unavailable/failed.
 *
 * @param context - Information about the file and current name
 * @returns RenameDecision object or null if decision cannot be made
 */
export async function decideIfShouldRename(
  context: RenameDecisionContext,
): Promise<RenameDecision | null> {
  offscreenLogger.log('[RenameDecision] Starting decision analysis', {
    filename: context.currentFilename,
    hasSummary: !!context.summary,
    language: context.language,
    fileType: context.fileType,
  });

  let session: Awaited<ReturnType<typeof createPromptSession>> = null;

  try {
    // Create session with low temperature for consistent decisions
    session = await createPromptSession({
      temperature: 0.2, // Low temperature = more deterministic
      topK: 10,
      systemPrompt: DECISION_SYSTEM_PROMPT,
      outputLanguage: 'en', // Decisions always in English
    });

    if (!session) {
      offscreenLogger.log('[RenameDecision] Failed to create prompt session');
      return null;
    }

    // Build the decision prompt
    const prompt = buildDecisionPrompt(context);

    offscreenLogger.log('[AI Prompt local-prompt-api text decision]', {
      promptLength: prompt.length,
      prompt,
      filename: context.currentFilename,
    });
    offscreenLogger.log('[AI Prompt local-prompt-api text decision]', prompt);

    // Make the Prompt API call with JSON schema constraint
    const response = await session.prompt(prompt, {
      responseConstraint: RENAME_DECISION_SCHEMA,
      omitResponseConstraintInput: true, // Omit schema to save tokens (format guidance in prompt)
    });

    offscreenLogger.log('[AI Response local-prompt-api text decision]', {
      responseLength: response.length,
      response,
      filename: context.currentFilename,
    });

    // Log token usage for debugging
    offscreenLogger.log('[RenameDecision] Token usage after prompt', {
      inputUsage: session.inputUsage,
      inputQuota: session.inputQuota,
      percentUsed:
        session.inputUsage && session.inputQuota
          ? `${((session.inputUsage / session.inputQuota) * 100).toFixed(1)}%`
          : 'unknown',
    });

    offscreenLogger.log('[RenameDecision] Received response', {
      responseLength: response.length,
    });

    // Parse the structured JSON response
    const decision = parseStructuredResponse<RenameDecision>(
      response,
      'rename-decision',
    );

    if (decision) {
      offscreenLogger.log('[AI Parsed local-prompt-api text decision]', {
        parsed: decision,
        filename: context.currentFilename,
      });
    } else {
      offscreenLogger.error('[AI Error local-prompt-api text decision]', {
        error: 'Failed to parse decision response',
        filename: context.currentFilename,
        responseLength: response.length,
      });
    }

    if (!decision) {
      offscreenLogger.log('[RenameDecision] Failed to parse response');
      return null;
    }

    // Validate the decision structure
    if (!validateDecisionResponse(decision)) {
      offscreenLogger.log('[RenameDecision] Response validation failed');
      return null;
    }

    offscreenLogger.log('[RenameDecision] Decision made', {
      shouldRename: decision.shouldRename,
      confidence: decision.confidence,
      reason: decision.reason,
      explanation: decision.explanation,
    });

    return decision;
  } catch (error) {
    offscreenLogger.warn('[RenameDecision] Decision failed', {
      error,
      filename: context.currentFilename,
    });
    return null;
  } finally {
    // CRITICAL: Always destroy session to prevent memory leaks
    if (session) {
      destroyPromptSession(session);
    }
  }
}
