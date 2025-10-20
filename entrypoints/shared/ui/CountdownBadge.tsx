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
  const isUrgent = seconds <= 5;

  return (
    <div
      aria-hidden="true"
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
        isUrgent
          ? 'bg-warning-100 text-warning-700'
          : 'bg-default-100 text-default-700'
      } ${isPaused ? 'opacity-60' : ''}`}
    >
      {formatCountdown(seconds)}
    </div>
  );
};
