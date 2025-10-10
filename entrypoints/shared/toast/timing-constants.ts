/**
 * Centralized timing constants for toast behavior.
 * All values are in milliseconds unless otherwise noted.
 */

export const TOAST_TIMING = {
  /**
   * Delay before removing a confirm toast after it's resolved.
   * Set to 0 to remove immediately upon status update.
   */
  CONFIRM_REMOVAL_DELAY_MS: 0,

  /**
   * Duration to display a rename result toast.
   * Gives users time to see the result and undo if needed.
   */
  RENAME_DISPLAY_DURATION_MS: 3_000,

  /**
   * Interval for updating countdown display in confirm toasts.
   * Higher values = less CPU usage, lower values = smoother countdown.
   */
  COUNTDOWN_TICK_INTERVAL_MS: 250,

  /**
   * Interval for updating rename toast progress bar.
   * 150ms provides smooth visual updates without excessive rendering.
   */
  RENAME_TICK_INTERVAL_MS: 150,

  /**
   * Threshold for progress updates to reduce unnecessary re-renders.
   * Only update if remaining time changed by more than this value.
   * 120ms allows ~1 frame tolerance at 150ms tick rate.
   */
  PROGRESS_UPDATE_THRESHOLD_MS: 120,
} as const;

/**
 * Type for timing constant keys (useful for testing/mocking)
 */
export type ToastTimingKey = keyof typeof TOAST_TIMING;
