/**
 * Actions sub-component for promotional banners.
 * Renders primary and optional secondary action buttons.
 */
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import type { ComponentType, JSX } from 'react';
import {
  type BannerColorScheme,
  buildPrimaryButtonClassName,
} from './banner-themes';

interface BannerActionsProps {
  /** Primary button label */
  primaryLabel: string;
  /** Primary button click handler */
  onPrimaryClick: () => void;
  /** Color scheme for button styling */
  theme: BannerColorScheme;
  /** Optional icon to show after primary button label */
  primaryIcon?: ComponentType<{ className: string }>;
  /** Optional secondary button label */
  secondaryLabel?: string;
  /** Optional secondary button click handler */
  onSecondaryClick?: () => void;
}

/**
 * Renders action buttons for a promotional banner.
 * Supports a primary CTA button and an optional secondary text button.
 */
export function BannerActions({
  primaryLabel,
  onPrimaryClick,
  theme,
  primaryIcon: PrimaryIcon = ArrowRightIcon,
  secondaryLabel,
  onSecondaryClick,
}: BannerActionsProps): JSX.Element {
  return (
    <div className="flex items-center gap-3 mt-2">
      <button
        type="button"
        onClick={onPrimaryClick}
        className={buildPrimaryButtonClassName(theme)}
      >
        {primaryLabel}
        <PrimaryIcon className="size-3.5" />
      </button>
      {secondaryLabel && onSecondaryClick && (
        <button
          type="button"
          onClick={onSecondaryClick}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
        >
          {secondaryLabel}
        </button>
      )}
    </div>
  );
}
