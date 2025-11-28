/**
 * Color scheme definitions for promotional banners.
 * Centralizes gradient and color tokens for consistent theming.
 */

/**
 * Defines the color scheme for a promotional banner.
 * All values are Tailwind CSS class fragments.
 */
export interface BannerColorScheme {
  /** Background gradient for the banner container (light mode) */
  containerBgLight: string;
  /** Background gradient for the banner container (dark mode) */
  containerBgDark: string;
  /** Border color (light mode) */
  borderLight: string;
  /** Border color (dark mode) */
  borderDark: string;
  /** Icon container background gradient */
  iconBg: string;
  /** Title text color (light mode) */
  titleLight: string;
  /** Title text color (dark mode) */
  titleDark: string;
  /** Primary button background gradient */
  buttonBg: string;
  /** Primary button hover background gradient */
  buttonHoverBg: string;
}

/**
 * Amber/orange theme for reminder banners (e.g., AI feature reminder).
 * Warm colors to draw attention without being alarming.
 */
export const amberTheme: BannerColorScheme = {
  containerBgLight: 'from-amber-50 via-orange-50 to-yellow-50',
  containerBgDark:
    'dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-950/20',
  borderLight: 'border-amber-200/60',
  borderDark: 'dark:border-amber-800/40',
  iconBg: 'from-amber-500 to-orange-500',
  titleLight: 'text-amber-900',
  titleDark: 'dark:text-amber-100',
  buttonBg: 'from-amber-600 to-orange-600',
  buttonHoverBg: 'hover:from-amber-700 hover:to-orange-700',
};

/**
 * Violet/blue theme for setup banners (e.g., AI model setup).
 * Cool colors to indicate new features or setup flows.
 */
export const violetTheme: BannerColorScheme = {
  containerBgLight: 'from-violet-50 via-blue-50 to-cyan-50',
  containerBgDark:
    'dark:from-violet-950/40 dark:via-blue-950/30 dark:to-cyan-950/20',
  borderLight: 'border-violet-200/60',
  borderDark: 'dark:border-violet-800/40',
  iconBg: 'from-violet-500 to-blue-500',
  titleLight: 'text-violet-900',
  titleDark: 'dark:text-violet-100',
  buttonBg: 'from-violet-600 to-blue-600',
  buttonHoverBg: 'hover:from-violet-700 hover:to-blue-700',
};

/**
 * Builds the complete className string for the banner container.
 */
export function buildContainerClassName(theme: BannerColorScheme): string {
  return `mb-3 rounded-lg overflow-hidden bg-gradient-to-br ${theme.containerBgLight} ${theme.containerBgDark} border ${theme.borderLight} ${theme.borderDark}`;
}

/**
 * Builds the complete className string for the icon container.
 */
export function buildIconContainerClassName(theme: BannerColorScheme): string {
  return `shrink-0 size-9 rounded-lg bg-gradient-to-br ${theme.iconBg} flex items-center justify-center shadow-sm`;
}

/**
 * Builds the complete className string for the title.
 */
export function buildTitleClassName(theme: BannerColorScheme): string {
  return `text-sm font-semibold ${theme.titleLight} ${theme.titleDark}`;
}

/**
 * Builds the complete className string for the primary action button.
 */
export function buildPrimaryButtonClassName(theme: BannerColorScheme): string {
  return `inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r ${theme.buttonBg} ${theme.buttonHoverBg} rounded-md shadow-sm transition-all duration-200 cursor-pointer`;
}
