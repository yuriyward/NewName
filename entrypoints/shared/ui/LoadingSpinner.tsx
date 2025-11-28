import type { JSX } from 'react';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  /**
   * Size of the spinner
   * - xs: 12px (h-3 w-3) - for inline/button use
   * - sm: 16px (h-4 w-4) - for compact contexts
   * - md: 24px (h-6 w-6) - default size
   * - lg: 32px (h-8 w-8) - for loading states
   */
  size?: SpinnerSize;
  /**
   * Custom color class (defaults to currentColor)
   * Examples: 'text-primary-500', 'text-default-400'
   */
  className?: string;
  /**
   * Accessibility label for screen readers
   */
  label?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

/**
 * Modern, minimal loading spinner component
 * Uses CSS border animation for smooth performance
 */
export function LoadingSpinner({
  size = 'md',
  className = '',
  label = 'Loading',
}: LoadingSpinnerProps): JSX.Element {
  return (
    <output
      aria-label={label}
      className={`
          ${sizeClasses[size]}
          animate-spin
          rounded-full
          border-2
          border-current
          border-t-transparent
          ${className}
        `.trim()}
    />
  );
}
