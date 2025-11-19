import type { FileType } from '@/entrypoints/shared/settings/settings';
import type { PageContextDetails } from '@/entrypoints/shared/state/page-context-store';

/**
 * Reasons why a filename might need (or not need) renaming.
 * These are explicitly constrained to ensure consistent categorization.
 */
export type RenameDecisionReason =
  | 'generic-name'
  | 'meaningless-hash'
  | 'already-descriptive'
  | 'contains-topic'
  | 'timestamp-only'
  | 'poor-formatting';

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
  pageContext?: PageContextDetails;
}
