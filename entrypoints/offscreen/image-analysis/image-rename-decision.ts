/**
 * Image rename decision logic using Prompt API
 * Decides if an image filename needs renaming based on description and metadata
 */

import { normalizeConfidenceScore } from '@/entrypoints/shared/constants/confidence-thresholds';
import { formatPageContextInline } from '@/entrypoints/shared/context/page-context-formatter';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { FileType } from '@/entrypoints/shared/settings/settings';
import type { PageContext } from '@/entrypoints/shared/state/page-context-store';
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
  pageContext?: Pick<PageContext, 'title' | 'heading' | 'url'>;
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

  return `You are evaluating whether an image filename needs improvement. Use the description to judge how well the current name fits the content. Be conservative—rename only when the name is clearly poor.

Context:
${contextLines.join('\n')}

Decision rules:
1. Rename when the name is generic (e.g., "image", "photo", "download"), a meaningless hash/UUID, only a timestamp, severely formatted (ALL_CAPS_NO_SEPARATORS), or mismatched with the description.
2. Keep the current name when it is already descriptive, professional, and properly formatted. When in doubt, keep it.

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
1. Good filename:
{"shouldRename": false, "confidence": 0.82, "reason": "already-descriptive", "explanation": "File name already mentions the sunset beach scene."}
2. Needs rename:
{"shouldRename": true, "confidence": 0.9, "reason": "generic-name", "explanation": "Current name is generic and does not describe the infographic."}

Respond with JSON only—no markdown, no explanations outside the JSON object.`;
}

const RENAME_DECISION_SYSTEM_PROMPT = `You are a filename quality analyzer for images.
Decide if an image filename needs improvement based on its description and current name.

Be CONSERVATIVE in your decisions. Only rename if the current name is truly poor.

Reasons to RENAME (shouldRename: true):
1. Generic names: "image", "photo", "download", "pic", "screenshot", "image (1)"
2. Meaningless hashes or UUIDs: "IMG_1234", "DSC_5678", "DCIM123", random hex strings
3. Timestamp-only names: "2024-01-15", "20240115_1430", dates without context
4. Poor formatting: ALL_CAPS only, no separators, hard to read
5. Name completely mismatches content: screenshot about "coding" named "vacation"

Reasons to KEEP (shouldRename: false):
1. Already descriptive and specific
2. Well-formatted and professional
3. Already contains relevant keywords about content
4. Name accurately reflects content
5. Good balance of clarity and brevity

IMPORTANT: If the current name is already good, return shouldRename: false.
Users uploaded this file - trust their naming unless it's clearly poor.

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
  pageContext?: Pick<PageContext, 'title' | 'heading' | 'url'>;
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
      debugLogger.warn('[ImageRenameDecision] Failed to create session');
      return null;
    }

    // Log initial session state
    console.log('[ImageRenameDecision] Session created - initial usage', {
      inputUsage: session.inputUsage,
      inputQuota: session.inputQuota,
    });

    // Build decision prompt
    const prompt = buildDecisionPrompt(params);

    console.log('[ImageRenameDecision] Sending decision request', {
      filename: params.currentFilename,
      descriptionLength: params.description.length,
    });

    const response = await session.prompt(prompt, {
      responseConstraint: IMAGE_RENAME_DECISION_SCHEMA,
      omitResponseConstraintInput: true,
    });
    const elapsedMs = Date.now() - startTime;

    // Log token usage after prompt
    console.log('[ImageRenameDecision] Token usage after prompt', {
      inputUsage: session.inputUsage,
      inputQuota: session.inputQuota,
      percentUsed:
        session.inputUsage && session.inputQuota
          ? `${((session.inputUsage / session.inputQuota) * 100).toFixed(1)}%`
          : 'unknown',
      session: session,
    });

    // Parse JSON response
    const parsed = parseStructuredResponse<RenameDecision>(
      response,
      'image-rename-decision',
    );

    if (!parsed) {
      debugLogger.warn(
        '[ImageRenameDecision] Failed to parse decision response',
        {
          response: response,
        },
      );
      return null;
    }

    // Validate response structure
    if (typeof parsed.shouldRename !== 'boolean') {
      debugLogger.warn('[ImageRenameDecision] Invalid shouldRename value', {
        value: parsed.shouldRename,
      });
      return null;
    }

    // Ensure confidence is in valid range
    const confidence = normalizeConfidenceScore(parsed.confidence);

    const reason = parsed.reason || 'unknown';

    console.log('[ImageRenameDecision] Decision made', {
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
    debugLogger.warn('[ImageRenameDecision] Decision making failed', {
      error,
    });
    return null;
  } finally {
    if (session) {
      destroyPromptSession(session);
    }
  }
}
