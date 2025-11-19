/**
 * Type definitions for image rename decision analysis.
 */

import type { FileType } from '@/entrypoints/shared/settings/settings';
import type { PageContextDetails } from '@/entrypoints/shared/state/page-context-store';

/**
 * Image rename decision result with confidence and reasoning.
 */
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

/**
 * Parameters for making a rename decision.
 */
export interface RenameDecisionParams {
  currentFilename: string;
  description: string;
  fileType: FileType;
  pageContext?: PageContextDetails;
}

/**
 * JSON Schema for enforcing structured output from the Prompt API.
 * Ensures consistent rename decision format.
 */
export const IMAGE_RENAME_DECISION_SCHEMA = {
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
