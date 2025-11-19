/**
 * Image rename decision logic using Prompt API
 * Decides if an image filename needs renaming based on description and metadata
 *
 * SECURITY: All untrusted inputs (filename, description) are sanitized.
 * Description is AI-generated but could potentially encode adversarial instructions.
 * Page context is already sanitized by the formatter.
 */

import { normalizeConfidenceScore } from '@/entrypoints/shared/constants/confidence-thresholds';
import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import {
  createPromptSession,
  destroyPromptSession,
  parseStructuredResponse,
} from '../text-analysis/prompt-helpers';
import {
  buildDecisionPrompt,
  RENAME_DECISION_SYSTEM_PROMPT,
} from './image-rename-decision-prompts';
import type {
  RenameDecision,
  RenameDecisionParams,
} from './image-rename-decision-types';
import { IMAGE_RENAME_DECISION_SCHEMA } from './image-rename-decision-types';

/**
 * Decide if an image needs renaming based on its description and current filename
 *
 * @param params - Decision parameters including filename and description
 * @returns Rename decision with confidence and reason
 */
export async function decideIfImageNeedsRename(
  params: RenameDecisionParams,
): Promise<RenameDecision | null> {
  let session = null;

  try {
    const startTime = Date.now();

    // Create Prompt API session
    session = await createPromptSession({
      systemPrompt: RENAME_DECISION_SYSTEM_PROMPT,
      temperature: 0.4,
      topK: 10,
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
      outputLanguage: 'en',
    });

    if (!session) {
      offscreenLogger.warn('[ImageRenameDecision] Failed to create session');
      return null;
    }

    // Log initial session state
    offscreenLogger.log(
      '[ImageRenameDecision] Session created - initial usage',
      {
        inputUsage: session.inputUsage,
        inputQuota: session.inputQuota,
      },
    );

    // Build decision prompt
    const prompt = buildDecisionPrompt(params);

    offscreenLogger.log('[AI Prompt local-prompt-api image decision]', {
      promptLength: prompt.length,
      prompt,
      filename: params.currentFilename,
    });
    offscreenLogger.log('[AI Prompt local-prompt-api image decision]', prompt);

    const response = await session.prompt(prompt, {
      responseConstraint: IMAGE_RENAME_DECISION_SCHEMA,
      omitResponseConstraintInput: true,
    });
    const elapsedMs = Date.now() - startTime;

    offscreenLogger.log('[AI Response local-prompt-api image decision]', {
      responseLength: response.length,
      response,
      filename: params.currentFilename,
      elapsedMs,
    });

    // Log token usage after prompt
    offscreenLogger.log('[ImageRenameDecision] Token usage after prompt', {
      inputUsage: session.inputUsage,
      inputQuota: session.inputQuota,
      percentUsed:
        session.inputUsage && session.inputQuota
          ? `${((session.inputUsage / session.inputQuota) * 100).toFixed(1)}%`
          : 'unknown',
    });

    // Parse JSON response
    const parsed = parseStructuredResponse<RenameDecision>(
      response,
      'image-rename-decision',
    );

    if (parsed) {
      offscreenLogger.log('[AI Parsed local-prompt-api image decision]', {
        parsed,
        filename: params.currentFilename,
      });
    } else {
      offscreenLogger.error('[AI Error local-prompt-api image decision]', {
        error: 'Failed to parse decision response',
        filename: params.currentFilename,
        responseLength: response.length,
      });
    }

    if (!parsed) {
      offscreenLogger.warn(
        '[ImageRenameDecision] Failed to parse decision response',
        {
          response: response,
        },
      );
      return null;
    }

    // Validate response structure
    if (typeof parsed.shouldRename !== 'boolean') {
      offscreenLogger.warn('[ImageRenameDecision] Invalid shouldRename value', {
        value: parsed.shouldRename,
      });
      return null;
    }

    // Ensure confidence is in valid range
    const confidence = normalizeConfidenceScore(parsed.confidence);

    const reason = parsed.reason || 'unknown';

    offscreenLogger.log('[ImageRenameDecision] Decision made', {
      filename: params.currentFilename,
      shouldRename: parsed.shouldRename,
      reason,
      confidence: confidence.toFixed(2),
      elapsedMs,
      inputUsage: session.inputUsage,
      inputQuota: session.inputQuota,
    });

    return {
      shouldRename: parsed.shouldRename,
      confidence,
      reason: reason as RenameDecision['reason'],
      explanation: parsed.explanation,
    };
  } catch (error) {
    offscreenLogger.warn('[ImageRenameDecision] Decision making failed', {
      error,
    });
    return null;
  } finally {
    if (session) {
      destroyPromptSession(session);
    }
  }
}
