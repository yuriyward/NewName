// Custom HeroUI theme configuration for NewName extension
// Based on brand requirements from PRDs: privacy-forward, clean, functional

export const newNameTheme = {
  light: {
    colors: {
      // Brand colors aligned with privacy-forward aesthetic
      primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#006FEE', // HeroUI default primary
        600: '#0052cc',
        700: '#003d99',
        800: '#002966',
        900: '#001533',
        DEFAULT: '#006FEE',
        foreground: '#FFFFFF',
      },

      // Success - for successful renames, confirmations
      success: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#17C964', // HeroUI success
        600: '#15b054',
        700: '#128a42',
        800: '#0f6332',
        900: '#0c4a25',
        DEFAULT: '#17C964',
        foreground: '#FFFFFF',
      },

      // Warning - for "kept original" notifications, cautions
      warning: {
        50: '#fffbeb',
        100: '#fef3c7',
        200: '#fde68a',
        300: '#fcd34d',
        400: '#fbbf24',
        500: '#F5A524', // HeroUI warning
        600: '#d97706',
        700: '#b45309',
        800: '#92400e',
        900: '#78350f',
        DEFAULT: '#F5A524',
        foreground: '#FFFFFF',
      },

      // Danger - for errors, destructive actions
      danger: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#F31260', // HeroUI danger
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
        DEFAULT: '#F31260',
        foreground: '#FFFFFF',
      },

      // Neutral colors for clean, unobtrusive UI
      background: '#FFFFFF',
      foreground: '#11181C',

      // Content layers for cards, surfaces
      content1: '#FFFFFF',
      content2: '#F4F4F5',
      content3: '#E4E4E7',
      content4: '#D4D4D8',

      // Default surface colors
      default: {
        50: '#fafafa',
        100: '#f4f4f5',
        200: '#e4e4e7',
        300: '#d4d4d8',
        400: '#a1a1aa',
        500: '#71717a',
        600: '#52525b',
        700: '#3f3f46',
        800: '#27272a',
        900: '#18181b',
        DEFAULT: '#F4F4F5',
        foreground: '#11181C',
      },

      // Focus and interactive states
      focus: '#006FEE',
      divider: '#E4E4E7',
    },

    // Layout tokens optimized for compact extension UI
    layout: {
      fontSize: {
        tiny: '0.6875rem', // 11px - captions, helper text (reduced from 12px)
        small: '0.75rem', // 12px - popup interface (reduced from 14px)
        medium: '0.875rem', // 14px - settings pages (reduced from 16px)
        large: '1rem', // 16px - headings (reduced from 18px)
      },

      lineHeight: {
        tiny: '0.875rem', // Tighter line heights for compact UI
        small: '1rem',
        medium: '1.25rem',
        large: '1.5rem',
      },

      radius: {
        small: '0.375rem', // 6px (reduced from 8px)
        medium: '0.5rem', // 8px (reduced from 12px)
        large: '0.75rem', // 12px (reduced from 16px)
      },

      borderWidth: {
        small: '1px',
        medium: '1px', // Thinner borders for compact feel
        large: '2px',
      },

      boxShadow: {
        small:
          '0px 0px 3px 0px rgba(0, 0, 0, 0.02), 0px 1px 6px 0px rgba(0, 0, 0, 0.04), 0px 0px 1px 0px rgba(0, 0, 0, 0.3)',
        medium:
          '0px 0px 8px 0px rgba(0, 0, 0, 0.03), 0px 2px 20px 0px rgba(0, 0, 0, 0.06), 0px 0px 1px 0px rgba(0, 0, 0, 0.3)',
        large:
          '0px 0px 20px 0px rgba(0, 0, 0, 0.04), 0px 20px 40px 0px rgba(0, 0, 0, 0.08), 0px 0px 1px 0px rgba(0, 0, 0, 0.3)',
      },

      // 6px grid system for compact UI (reduced from 8px)
      spacing: {
        unit: '0.375rem', // 6px base unit (reduced from 8px)
        xs: '0.25rem', // 4px
        sm: '0.375rem', // 6px
        md: '0.75rem', // 12px (reduced from 16px)
        lg: '1rem', // 16px (reduced from 24px)
        xl: '1.5rem', // 24px (reduced from 32px)
        '2xl': '2rem', // 32px (reduced from 48px)
      },
    },
  },

  dark: {
    colors: {
      // Dark theme variations maintaining brand consistency
      primary: {
        50: '#001533',
        100: '#002966',
        200: '#003d99',
        300: '#0052cc',
        400: '#006FEE',
        500: '#3b82f6',
        600: '#60a5fa',
        700: '#93c5fd',
        800: '#bfdbfe',
        900: '#dbeafe',
        DEFAULT: '#006FEE',
        foreground: '#FFFFFF',
      },

      success: {
        50: '#0c4a25',
        100: '#0f6332',
        200: '#128a42',
        300: '#15b054',
        400: '#17C964',
        500: '#22c55e',
        600: '#4ade80',
        700: '#86efac',
        800: '#bbf7d0',
        900: '#dcfce7',
        DEFAULT: '#17C964',
        foreground: '#000000',
      },

      warning: {
        50: '#78350f',
        100: '#92400e',
        200: '#b45309',
        300: '#d97706',
        400: '#F5A524',
        500: '#f59e0b',
        600: '#fbbf24',
        700: '#fcd34d',
        800: '#fde68a',
        900: '#fef3c7',
        DEFAULT: '#F5A524',
        foreground: '#000000',
      },

      danger: {
        50: '#7f1d1d',
        100: '#991b1b',
        200: '#b91c1c',
        300: '#dc2626',
        400: '#F31260',
        500: '#ef4444',
        600: '#f87171',
        700: '#fca5a5',
        800: '#fecaca',
        900: '#fee2e2',
        DEFAULT: '#F31260',
        foreground: '#FFFFFF',
      },

      // Dark theme surfaces
      background: '#000000',
      foreground: '#ECEDEE',

      content1: '#18181B',
      content2: '#27272A',
      content3: '#3F3F46',
      content4: '#52525B',

      default: {
        50: '#18181b',
        100: '#27272a',
        200: '#3f3f46',
        300: '#52525b',
        400: '#71717a',
        500: '#a1a1aa',
        600: '#d4d4d8',
        700: '#e4e4e7',
        800: '#f4f4f5',
        900: '#fafafa',
        DEFAULT: '#27272A',
        foreground: '#ECEDEE',
      },

      focus: '#006FEE',
      divider: '#3F3F46',
    },

    // Compact layout tokens for dark theme
    layout: {
      fontSize: {
        tiny: '0.6875rem', // 11px - captions, helper text (reduced from 12px)
        small: '0.75rem', // 12px - popup interface (reduced from 14px)
        medium: '0.875rem', // 14px - settings pages (reduced from 16px)
        large: '1rem', // 16px - headings (reduced from 18px)
      },

      lineHeight: {
        tiny: '0.875rem', // Tighter line heights for compact UI
        small: '1rem',
        medium: '1.25rem',
        large: '1.5rem',
      },

      radius: {
        small: '0.375rem', // 6px (reduced from 8px)
        medium: '0.5rem', // 8px (reduced from 12px)
        large: '0.75rem', // 12px (reduced from 16px)
      },

      borderWidth: {
        small: '1px',
        medium: '1px', // Thinner borders for compact feel
        large: '2px',
      },

      boxShadow: {
        small:
          '0px 0px 3px 0px rgba(0, 0, 0, 0.1), 0px 1px 6px 0px rgba(0, 0, 0, 0.15), 0px 0px 1px 0px rgba(255, 255, 255, 0.05)',
        medium:
          '0px 0px 8px 0px rgba(0, 0, 0, 0.15), 0px 2px 20px 0px rgba(0, 0, 0, 0.25), 0px 0px 1px 0px rgba(255, 255, 255, 0.05)',
        large:
          '0px 0px 20px 0px rgba(0, 0, 0, 0.2), 0px 20px 40px 0px rgba(0, 0, 0, 0.35), 0px 0px 1px 0px rgba(255, 255, 255, 0.05)',
      },

      spacing: {
        unit: '0.375rem', // 6px base unit (reduced from 8px)
        xs: '0.25rem', // 4px
        sm: '0.375rem', // 6px
        md: '0.75rem', // 12px (reduced from 16px)
        lg: '1rem', // 16px (reduced from 24px)
        xl: '1.5rem', // 24px (reduced from 32px)
        '2xl': '2rem', // 32px (reduced from 48px)
      },
    },
  },
};

// Component-specific styling presets - Compact Sizing
export const componentPresets = {
  // Toast notification styles - Compact
  toast: {
    base: 'flex items-center gap-2 p-3 rounded-md shadow-small border max-w-xs text-sm',
    variants: {
      success: 'bg-content1 border-success-200 text-foreground',
      warning: 'bg-content1 border-warning-200 text-foreground',
      danger: 'bg-content1 border-danger-200 text-foreground',
      info: 'bg-content1 border-primary-200 text-foreground',
    },
  },

  // Card styles for mode selection, settings - Compact
  card: {
    base: 'bg-content1 rounded-md p-4 shadow-small border border-content3',
    interactive: 'hover:bg-content2 cursor-pointer transition-colors',
    selected: 'border-primary-500 bg-primary-50',
  },

  // Button variants matching extension patterns - Compact
  button: {
    primary:
      'bg-primary text-primary-foreground hover:opacity-80 text-xs px-3 py-1.5',
    secondary:
      'bg-default text-default-foreground hover:bg-content2 text-xs px-3 py-1.5',
    ghost:
      'bg-transparent text-foreground hover:bg-content2 text-xs px-3 py-1.5',
    danger:
      'bg-danger text-danger-foreground hover:opacity-80 text-xs px-3 py-1.5',
  },

  // Chip/badge styles - Compact
  chip: {
    base: 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-xs font-medium',
    variants: {
      primary: 'bg-primary-100 text-primary-600',
      secondary: 'bg-content2 text-foreground',
      success: 'bg-success-100 text-success-600',
      warning: 'bg-warning-100 text-warning-600',
    },
  },
};

// Responsive breakpoints for extension contexts
export const breakpoints = {
  popup: '320px', // Extension popup width
  settings: '768px', // Settings page comfortable width
  desktop: '1024px', // Full desktop layout
};

// Animation presets matching extension feel
export const animations = {
  // Toast entrance/exit
  slideIn: 'slideInRight 0.3s ease-out',
  slideOut: 'slideOutRight 0.2s ease-in',

  // Loading states
  spin: 'spin 1s linear infinite',
  pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  bounce: 'bounce 1s infinite',

  // Hover transitions
  hover: 'all 0.2s ease',
  focus: 'all 0.15s ease',
};

export default newNameTheme;
