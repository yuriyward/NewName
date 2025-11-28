/**
 * Container sub-component for promotional banners.
 * Provides the outer wrapper with gradient background and border styling.
 */
import type { JSX, ReactNode } from 'react';
import {
  type BannerColorScheme,
  buildContainerClassName,
} from './banner-themes';

interface BannerContainerProps {
  /** Color scheme for container styling */
  theme: BannerColorScheme;
  /** Child elements to render inside the container */
  children: ReactNode;
}

/**
 * Renders the outer container for a promotional banner.
 * Applies gradient background and border based on the color scheme.
 */
export function BannerContainer({
  theme,
  children,
}: BannerContainerProps): JSX.Element {
  return (
    <div className={buildContainerClassName(theme)}>
      <div className="p-3">
        <div className="flex items-start gap-3">{children}</div>
      </div>
    </div>
  );
}
