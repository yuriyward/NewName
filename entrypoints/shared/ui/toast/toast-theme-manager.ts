/**
 * Theme management for toast UI elements.
 */
import {
  getSettings,
  subscribeSettings,
} from '@/entrypoints/shared/settings/settings';

export interface ThemeTarget {
  host: HTMLElement;
  mount: HTMLElement;
}

/**
 * Creates a theme manager that syncs theme between settings and DOM elements.
 */
export function createThemeManager(
  target: ThemeTarget,
  onThemeChange?: () => void,
) {
  let currentTheme: 'light' | 'dark' = 'dark';

  function applyTheme(theme: 'light' | 'dark'): void {
    // Apply to host for :host(.dark) selectors
    target.host.className = theme;
    // Apply to mount for HeroUI components
    target.mount.className = theme;
  }

  // Initialize theme from settings
  getSettings()
    .then((settings) => {
      currentTheme = settings.theme;
      applyTheme(settings.theme);
      onThemeChange?.();
    })
    .catch(() => {
      onThemeChange?.();
    });

  // Subscribe to theme changes
  subscribeSettings((settings) => {
    if (settings.theme !== currentTheme) {
      currentTheme = settings.theme;
      applyTheme(settings.theme);
    }
  });

  return {
    getCurrentTheme: () => currentTheme,
  };
}
