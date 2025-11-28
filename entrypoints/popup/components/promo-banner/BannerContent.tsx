/**
 * Content sub-component for promotional banners.
 * Renders the title and description text.
 */
import type { JSX, ReactNode } from 'react';
import { type BannerColorScheme, buildTitleClassName } from './banner-themes';

interface BannerContentProps {
  /** Banner title text */
  title: string;
  /** Banner description text */
  description: string;
  /** Color scheme for text styling */
  theme: BannerColorScheme;
  /** Optional additional content (e.g., error messages) */
  children?: ReactNode;
}

/**
 * Renders the text content section of a promotional banner.
 * Includes title, description, and optional additional content.
 */
export function BannerContent({
  title,
  description,
  theme,
  children,
}: BannerContentProps): JSX.Element {
  return (
    <div className="flex-1 min-w-0 space-y-1.5">
      <h3 className={buildTitleClassName(theme)}>{title}</h3>
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
        {description}
      </p>
      {children}
    </div>
  );
}
