/**
 * Icon container sub-component for promotional banners.
 * Renders an icon with a gradient background.
 */
import type { ComponentType, JSX } from 'react';
import {
  type BannerColorScheme,
  buildIconContainerClassName,
} from './banner-themes';

interface BannerIconProps {
  /** The icon component to render */
  icon: ComponentType<{ className: string }>;
  /** Color scheme for the icon container */
  theme: BannerColorScheme;
}

/**
 * Renders an icon inside a gradient-styled container.
 * Used as the visual anchor for promotional banners.
 */
export function BannerIcon({
  icon: Icon,
  theme,
}: BannerIconProps): JSX.Element {
  return (
    <div className={buildIconContainerClassName(theme)}>
      <Icon className="size-5 text-white" />
    </div>
  );
}
