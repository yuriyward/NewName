/**
 * Reusable theme toggle button component
 * Provides consistent theme switching across all extension pages
 */

import { SunIcon } from '@heroicons/react/16/solid';
import { MoonIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@heroui/tooltip';
import { useTheme } from '@heroui/use-theme';
import { useCallback } from 'react';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { updateSettings } from '@/entrypoints/shared/settings/settings';

interface ThemeToggleButtonProps {
  /** Additional CSS classes for positioning */
  className?: string;
  /** Button size variant */
  size?: 'sm' | 'md';
}

/**
 * Theme toggle button that switches between light and dark modes
 * Persists the theme preference to settings storage
 */
export function ThemeToggleButton({
  className = '',
  size = 'md',
}: ThemeToggleButtonProps): React.JSX.Element {
  const { theme, setTheme } = useTheme();

  const handleThemeToggle = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    void updateSettings({ theme: newTheme }).catch((err) => {
      debugLogger.error('[ThemeToggleButton] Failed to save theme', {
        error: err,
      });
    });
  }, [theme, setTheme]);

  const sizeClasses = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const iconSize = size === 'sm' ? 'size-4' : 'size-5';

  return (
    <Tooltip
      content={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      placement="bottom"
      delay={300}
    >
      <button
        type="button"
        onClick={handleThemeToggle}
        className={`${sizeClasses} rounded-lg bg-default-100 hover:bg-default-200 flex items-center justify-center text-foreground transition-all cursor-pointer ${className}`}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? (
          <SunIcon className={iconSize} />
        ) : (
          <MoonIcon className={iconSize} />
        )}
      </button>
    </Tooltip>
  );
}
