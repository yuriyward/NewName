/**
 * Type definitions for filename generation.
 * Shared types used across generation, validation, and prompt modules.
 */

import type { Separator } from '@/entrypoints/shared/settings/settings';
import type { PageContextDetails } from '@/entrypoints/shared/state/page-context-store';

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
  // Optional PDF context from phase 1 analysis
  pdfContext?: {
    source: 'pdf';
    documentTitle: string | null;
    shouldPrioritizeTitle: boolean;
  };
  // Page context captured at download time (title, heading, URL)
  pageContext?: PageContextDetails;
}

/**
 * JSON Schema for enforcing structured output from the Prompt API.
 * This ensures the model returns filename components in a consistent format.
 */
export const FILENAME_GENERATION_SCHEMA = {
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
  additionalProperties: false,
} as const;
