/**
 * Confidence thresholds for AI rename decisions shared across the codebase.
 *
 * The rename pipeline uses a three-tier scale:
 * - `>= 0.8` ⟶ silent rename without showing a confirmation toast.
 * - `>= 0.5` ⟶ confirmation toast with an auto-apply countdown.
 * - `< 0.5`  ⟶ manual confirmation, no automatic actions.
 *
 * Keeping the thresholds and helpers here ensures every surface (toast routing,
 * history entries, tests, etc.) speaks the same language. If we ever make them
 * user-configurable we only need to touch this module.
 */

/**
 * Threshold for silent rename (no confirmation toast).
 * Files with confidence >= this value are renamed immediately with only a
 * completion notification shown afterwards.
 */
export const SILENT_RENAME_THRESHOLD = 0.8;

/**
 * Threshold for auto-apply with countdown.
 * Files with confidence >= this value show a confirmation toast with a
 * countdown timer (default 10 seconds) that auto-applies the rename unless the
 * user cancels or edits the suggestion.
 */
export const AUTO_APPLY_THRESHOLD = 0.5;

/**
 * Represents a moderate-confidence state (auto-apply disabled, but proposal is
 * still worth surfacing). Used by mock/contextual flows that should be easy to
 * adjust alongside the other tiers.
 */
export const MODERATE_CONFIDENCE_SCORE = 0.6;

/**
 * Runtime guard for confidence scores.
 *
 * @example
 * if (!isValidConfidenceScore(input)) {
 *   throw new Error('Confidence must be a number between 0 and 1.');
 * }
 */
export function isValidConfidenceScore(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return AUTO_APPLY_THRESHOLD;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

/**
 * Ensures the provided score lives inside the [0, 1] range and falls back to a
 * sensible default (0.5 unless overridden).
 */
export function normalizeConfidenceScore(
  value: number | null | undefined,
  fallbackConfidence: number = AUTO_APPLY_THRESHOLD,
): number {
  const fallback = clampConfidence(fallbackConfidence);
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return clampConfidence(value);
}

export type AutoApplyBehaviorLevel = 'silent' | 'countdown' | 'manual';

export interface AutoApplyBehavior {
  /** Confidence score clamped into the valid [0, 1] range. */
  confidence: number;
  /** True when the rename can skip the confirmation toast entirely. */
  shouldSilentRename: boolean;
  /** True when a confirm toast countdown should be scheduled. */
  shouldAutoApply: boolean;
  /** Convenience descriptor for analytics/logging. */
  level: AutoApplyBehaviorLevel;
}

export interface AutoApplyBehaviorOptions {
  /**
   * Fallback confidence used when the provided score is missing or invalid.
   * Defaults to the auto-apply threshold (0.5) to match legacy behavior.
   */
  fallbackConfidence?: number;
}

/**
 * Normalizes a confidence score into actionable behavior flags.
 *
 * @example
 * const high = getAutoApplyBehavior(0.92);
 * high.level; // "silent"
 * high.shouldSilentRename; // true
 *
 * @example
 * const unknown = getAutoApplyBehavior(undefined, { fallbackConfidence: 0 });
 * unknown.level; // "manual"
 * unknown.shouldAutoApply; // false
 */
export function getAutoApplyBehavior(
  confidence: number | null | undefined,
  options?: AutoApplyBehaviorOptions,
): AutoApplyBehavior {
  const normalizedConfidence = normalizeConfidenceScore(
    confidence,
    options?.fallbackConfidence,
  );

  const shouldSilentRename = normalizedConfidence >= SILENT_RENAME_THRESHOLD;
  const shouldAutoApply = normalizedConfidence >= AUTO_APPLY_THRESHOLD;

  let level: AutoApplyBehaviorLevel = 'manual';
  if (shouldSilentRename) {
    level = 'silent';
  } else if (shouldAutoApply) {
    level = 'countdown';
  }

  return {
    confidence: normalizedConfidence,
    shouldSilentRename,
    shouldAutoApply,
    level,
  };
}
