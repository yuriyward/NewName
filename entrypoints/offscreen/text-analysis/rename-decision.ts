/**
 * Rename decision module using Chrome's Prompt API.
 * This module decides whether a filename needs renaming by analyzing its quality
 * against the file content. It uses a separate JSON schema focused purely on
 * the decision logic, independent of filename generation.
 */

import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import type { FileType } from '@/entrypoints/shared/settings/settings';
import type { PageContext } from '@/entrypoints/shared/state/page-context-store';
import {
  buildBaseContextDescription,
  createPromptSession,
  destroyPromptSession,
  parseStructuredResponse,
} from './prompt-helpers';

/**
 * Reasons why a filename might need (or not need) renaming.
 * These are explicitly constrained in the JSON schema to ensure
 * consistent categorization.
 */
export type RenameDecisionReason =
  | 'generic-name' // "document", "file", "download", "untitled"
  | 'meaningless-hash' // UUIDs, random strings
  | 'already-descriptive' // Current name is good
  | 'contains-topic' // Has relevant keywords from summary
  | 'timestamp-only' // Just dates/numbers
  | 'poor-formatting'; // Bad separators, ALL_CAPS, no structure

/**
 * Structured response from the decision prompt.
 * This schema is enforced via JSON Schema in the Prompt API call.
 */
export interface RenameDecision {
  shouldRename: boolean;
  confidence: number; // 0.0 to 1.0
  reason: RenameDecisionReason;
  explanation?: string;
}

/**
 * Context information needed to make a rename decision.
 */
export interface RenameDecisionContext {
  currentFilename: string;
  summary?: string;
  language?: string;
  originalName: string;
  fileType: FileType;
  pageContext?: Pick<PageContext, 'title' | 'heading' | 'url'>;
}

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

  return `Analyze this filename and decide if it needs renaming:

${baseContext}

Original download name: "${context.originalName}"

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
 * Validate that the decision response has required fields and correct types.
 * This adds runtime validation on top of the JSON schema constraint.
 */
function validateDecisionResponse(
  decision: RenameDecision,
): decision is RenameDecision {
  if (typeof decision.shouldRename !== 'boolean') {
    offscreenLogger.warn('[RenameDecision] Invalid shouldRename type', {
      type: typeof decision.shouldRename,
    });
    return false;
  }

  if (
    typeof decision.confidence !== 'number' ||
    decision.confidence < 0 ||
    decision.confidence > 1
  ) {
    offscreenLogger.warn('[RenameDecision] Invalid confidence value', {
      confidence: decision.confidence,
    });
    return false;
  }

  const validReasons: RenameDecisionReason[] = [
    'generic-name',
    'meaningless-hash',
    'already-descriptive',
    'contains-topic',
    'timestamp-only',
    'poor-formatting',
  ];

  if (!validReasons.includes(decision.reason)) {
    offscreenLogger.warn('[RenameDecision] Invalid reason value', {
      reason: decision.reason,
    });
    return false;
  }

  if (
    decision.explanation !== undefined &&
    typeof decision.explanation !== 'string'
  ) {
    offscreenLogger.warn('[RenameDecision] Invalid explanation type', {
      type: typeof decision.explanation,
    });
    return false;
  }

  return true;
}

/**
 * System prompt that establishes the AI's role as a filename quality analyzer.
 * This is separate from the per-request prompt and sets the overall context.
 */
const DECISION_SYSTEM_PROMPT = `You are a filename quality analyzer. Your job is to decide if a filename needs improvement based on its content and current name.

Be CONSERVATIVE in your decisions:
- Only suggest renaming for truly generic, meaningless, or poorly formatted names
- Preserve existing names that are already descriptive or well-structured
- When uncertain, prefer keeping the existing name

Focus on these principles:
- Human readability over technical accuracy
- Content relevance (does the name match the summary?)
- Professional formatting standards
- Practical usability for file organization

Always respond with valid JSON matching the provided schema.`;

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
