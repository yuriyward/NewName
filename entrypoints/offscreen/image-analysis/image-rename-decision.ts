/**
 * Image rename decision logic using Prompt API
 * Decides if an image filename needs renaming based on description and metadata
 */

import { normalizeConfidenceScore } from '@/entrypoints/shared/constants/confidence-thresholds';
import { formatPageContextInline } from '@/entrypoints/shared/context/page-context-formatter';
import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import type { FileType } from '@/entrypoints/shared/settings/settings';
import type { PageContextDetails } from '@/entrypoints/shared/state/page-context-store';
import {
  createPromptSession,
  destroyPromptSession,
  parseStructuredResponse,
} from '../text-analysis/prompt-helpers';

export interface RenameDecision {
  shouldRename: boolean;
  confidence: number;
  reason:
    | 'generic-name'
    | 'meaningless-hash'
    | 'timestamp-only'
    | 'poor-formatting'
    | 'already-descriptive'
    | 'already-good'
    | 'unknown';
  explanation?: string;
}

const IMAGE_RENAME_DECISION_SCHEMA = {
  type: 'object',
  properties: {
    shouldRename: {
      type: 'boolean',
      description:
        'Whether the current filename should be replaced with a better one.',
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description:
        'Confidence in the decision, where 0 is unsure and 1 is certain.',
    },
    reason: {
      type: 'string',
      enum: [
        'generic-name',
        'meaningless-hash',
        'timestamp-only',
        'poor-formatting',
        'already-descriptive',
        'already-good',
        'unknown',
      ],
      description: 'Primary category that explains the decision.',
    },
    explanation: {
      type: 'string',
      maxLength: 150,
      description:
        'Optional short sentence that explains the rationale in plain language.',
    },
  },
  required: ['shouldRename', 'confidence', 'reason'],
  additionalProperties: false,
} as const;

function buildDecisionPrompt(params: {
  currentFilename: string;
  description: string;
  fileType: FileType;
  pageContext?: PageContextDetails;
}): string {
  const filenameLiteral = JSON.stringify(params.currentFilename);
  const descriptionLiteral = JSON.stringify(params.description.trim());

  const contextLines = [
    `- Current filename: ${filenameLiteral}`,
    `- Image description: ${descriptionLiteral}`,
    `- File type: "${params.fileType}"`,
  ];

  // Add page context if available
  const pageContextFormatted = formatPageContextInline(params.pageContext);
  if (pageContextFormatted) {
    contextLines.push(`- Source page: ${pageContextFormatted}`);
  }

  const decisionRules = [
    '1. Rename when the name is generic (e.g., "image", "photo", "download"), a meaningless hash/UUID, only a timestamp, severely formatted (ALL_CAPS_NO_SEPARATORS), or mismatched with the description.',
    '2. Keep the current name when it is already descriptive, professional, and properly formatted. When in doubt, keep it.',
  ];

  const pageSpecificParts: string[] = [];
  if (params.pageContext?.title) {
    pageSpecificParts.push(`title ${JSON.stringify(params.pageContext.title)}`);
  }
  if (params.pageContext?.heading) {
    pageSpecificParts.push(
      `heading ${JSON.stringify(params.pageContext.heading)}`,
    );
  }

  if (pageSpecificParts.length > 0) {
    decisionRules.push(
      `3. The source page mentions ${pageSpecificParts.join(
        ' and ',
      )}. If those specific names are missing from the filename, treat it as incomplete and choose shouldRename: true.`,
    );
  }

  return `You are evaluating whether an image filename needs improvement based on the content description and page context.

Context:
${contextLines.join('\n')}

Decision rules (IN ORDER OF PRIORITY):
${decisionRules.join('\n')}

CRITICAL: Rule #3 overrides all other considerations. A timestamp + generic code (like "2025-11-18_14-22 s-l1600") is NOT sufficient when meaningful page context exists. The filename MUST contain recognizable keywords from the source page title or heading.

Return JSON that matches this schema:
\`\`\`json
{
  "shouldRename": boolean,
  "confidence": number (between 0 and 1),
  "reason": "generic-name" | "meaningless-hash" | "timestamp-only" | "poor-formatting" | "already-descriptive" | "already-good" | "unknown",
  "explanation": string (optional, <= 150 characters)
}
\`\`\`

Examples:
1. Good filename (has page keywords):
{"shouldRename": false, "confidence": 0.82, "reason": "already-descriptive", "explanation": "Filename contains 'sunset beach' matching the page title."}

2. Needs rename (missing page context):
{"shouldRename": true, "confidence": 0.9, "reason": "generic-name", "explanation": "Filename is timestamp+code but missing 'Silent Angel Switch' from page title."}

3. Needs rename (timestamp only):
{"shouldRename": true, "confidence": 0.85, "reason": "timestamp-only", "explanation": "Filename lacks any keywords from page title 'Network Switch Product'."}

Respond with JSON only—no markdown, no explanations outside the JSON object.`;
}

const RENAME_DECISION_SYSTEM_PROMPT = `You are a filename quality analyzer for images.
Decide if an image filename needs improvement based on its description, current name, and page context.

PRIMARY RULE: When page context (title/heading) is provided, the filename MUST contain recognizable keywords from that context. A timestamp + random code is insufficient.

Be CONSERVATIVE in your decisions:
- Generic names should be flagged for rename
- Meaningless hashes or UUID-style codes must be renamed
- Timestamp-only names almost always need improvement
- Poor formatting (ALL_CAPS_NO_SEPARATORS) is unacceptable
- Already descriptive, professional names should be kept
- When uncertain, prefer keeping the current filename

Reasons to RENAME (shouldRename: true):
1. **Missing page context keywords**: Page title/heading exists but filename lacks those terms
2. Generic names: "image", "photo", "download", "pic", "screenshot", "image (1)"
3. Meaningless hashes or UUIDs: "IMG_1234", "DSC_5678", "DCIM123", random hex strings
4. Timestamp-only names: "2024-01-15", "20240115_1430", dates without descriptive context
5. Poor formatting: ALL_CAPS_NO_SEPARATORS, unreadable structure
6. Mismatched content: filename doesn't reflect what's actually in the image

Reasons to KEEP (shouldRename: false) - ONLY when:
1. Filename already contains page title/heading keywords (if page context was provided)
2. Already descriptive and professional
3. Accurately reflects image content
4. Good balance of clarity and specificity

EVALUATION HIERARCHY:
- First: Check if page context keywords are present in filename → if missing, MUST rename
- Second: Evaluate if filename is descriptive of actual content
- Third: Check formatting quality

Real-world examples:
- "2025-11-18_14-22 s-l1600.webp" with page "Silent Angel Switch" → shouldRename: true (missing product name)
- "2025-11-18 Silent-Angel-Network-Switch.webp" with page "Silent Angel Switch" → shouldRename: false (has keywords)
- "IMG_1234.jpg" → shouldRename: true (meaningless code)
- "sunset-over-ocean.jpg" → shouldRename: false (descriptive)

Respond with JSON only: {"shouldRename": boolean, "confidence": 0.0-1.0, "reason": "...", "explanation": "..."}`;

/**
 * Decide if an image needs renaming based on its description and current filename
 *
 * @param params - Decision parameters including filename and description
 * @returns Rename decision with confidence and reason
 */
export async function decideIfImageNeedsRename(params: {
  currentFilename: string;
  description: string;
  fileType: FileType;
  pageContext?: PageContextDetails;
}): Promise<RenameDecision | null> {
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
