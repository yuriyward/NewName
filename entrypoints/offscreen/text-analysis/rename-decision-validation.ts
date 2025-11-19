import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import type {
  RenameDecision,
  RenameDecisionReason,
} from './rename-decision-types';

const VALID_REASONS: RenameDecisionReason[] = [
  'generic-name',
  'meaningless-hash',
  'already-descriptive',
  'contains-topic',
  'timestamp-only',
  'poor-formatting',
];

/**
 * Runtime validation for AI rename decision responses.
 */
export function validateDecisionResponse(
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

  if (!VALID_REASONS.includes(decision.reason)) {
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
