/**
 * Confidence thresholds for AI rename decisions
 *
 * Three-tier system applied consistently across all file types (image, text, PDF):
 * - SILENT_RENAME: >=0.8 applies immediately without confirmation
 * - AUTO_APPLY: >=0.5 shows countdown toast (10s to cancel)
 * - MANUAL: <0.5 requires explicit user approval
 *
 * These values are centralized here to enable future user configuration.
 */

/**
 * Threshold for silent rename (no confirmation toast).
 * Files with confidence >= this value are renamed immediately
 * with only a brief completion notification shown.
 */
export const SILENT_RENAME_THRESHOLD = 0.8;

/**
 * Threshold for auto-apply with countdown.
 * Files with confidence >= this value show a confirmation toast
 * with a countdown timer (default 10s) that auto-applies the rename.
 * User can cancel or edit during the countdown.
 */
export const AUTO_APPLY_THRESHOLD = 0.5;
