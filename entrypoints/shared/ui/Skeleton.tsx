/**
 * Reusable Skeleton component for loading states
 * Wraps @heroui/skeleton for consistency with the design system
 */

import { Skeleton as HeroUISkeleton } from '@heroui/skeleton';
import type { JSX } from 'react';

type SkeletonVariant = 'rectangular' | 'circular' | 'rounded';

interface SkeletonProps {
  /** Shape variant of the skeleton */
  variant?: SkeletonVariant;
  /** Additional CSS classes for customizing size and appearance */
  className?: string;
  /** Aspect ratio for video/image placeholders (e.g., 16/9) */
  aspectRatio?: number;
  /** Disable the pulse animation */
  disableAnimation?: boolean;
}

/**
 * Maps variant to Tailwind border-radius classes
 */
const variantClasses: Record<SkeletonVariant, string> = {
  rectangular: 'rounded-none',
  circular: 'rounded-full',
  rounded: 'rounded-lg',
};

/**
 * Skeleton loading placeholder component
 *
 * @example Basic usage with custom dimensions
 * ```tsx
 * <Skeleton className="h-4 w-full" />
 * ```
 *
 * @example Circular skeleton for avatars
 * ```tsx
 * <Skeleton variant="circular" className="h-10 w-10" />
 * ```
 *
 * @example Video/image placeholder with aspect ratio
 * ```tsx
 * <Skeleton aspectRatio={16/9} className="w-full" />
 * ```
 */
export function Skeleton({
  variant = 'rounded',
  className = '',
  aspectRatio,
  disableAnimation,
}: SkeletonProps): JSX.Element {
  const shapeClasses = variantClasses[variant];
  const combinedClassName = `${shapeClasses} ${className}`.trim();

  // When aspectRatio is provided, use padding-bottom technique for responsive sizing
  if (aspectRatio !== undefined && aspectRatio > 0) {
    return (
      <output
        className={`relative block ${combinedClassName}`}
        style={{ paddingBottom: `${(1 / aspectRatio) * 100}%` }}
        aria-busy="true"
      >
        <HeroUISkeleton
          disableAnimation={disableAnimation}
          className="absolute inset-0 h-full w-full"
          classNames={{
            base: shapeClasses,
          }}
        />
        <span className="sr-only">Loading...</span>
      </output>
    );
  }

  return (
    <HeroUISkeleton
      disableAnimation={disableAnimation}
      className={combinedClassName}
      classNames={{
        base: shapeClasses,
      }}
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </HeroUISkeleton>
  );
}
