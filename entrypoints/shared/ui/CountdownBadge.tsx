/**
 * Countdown badge component
 * Displays the auto-apply countdown with color changes when urgent
 */

import type React from 'react';

interface CountdownBadgeProps {
  seconds: number;
  /**
   * Whether the countdown is paused (affects styling)
   */
  isPaused?: boolean;
}

/**
 * Format countdown seconds to display string
 */
function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0s';
  return `${seconds}s`;
}

export const CountdownBadge: React.FC<CountdownBadgeProps> = ({
  seconds,
  isPaused = false,
}) => {
  return (
    <span
      aria-hidden="true"
      className="text-xs font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-nowrap flex-shrink-0 flex items-center justify-center gap-1"
    >
      {isPaused ? '⏸' : formatCountdown(seconds)}
    </span>
  );
};
