/**
 * Theme management application service
 * Handles automatic theme detection and daily reset logic
 */

export type Theme = 'light' | 'dark';

/**
 * Detect system theme preference
 */
export function detectSystemTheme(): Theme {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

/**
 * Check if theme should be reset (new day)
 */
export function shouldResetTheme(): boolean {
  const today = new Date().toDateString();
  const lastThemeReset = localStorage.getItem('lastThemeReset');
  return !lastThemeReset || lastThemeReset !== today;
}

/**
 * Mark theme as reset for today
 */
export function markThemeReset(): void {
  const today = new Date().toDateString();
  localStorage.setItem('lastThemeReset', today);
}

/**
 * Get appropriate theme (system detection + daily reset logic)
 */
export function getAppropriateTheme(currentTheme?: string | null): Theme {
  const normalized =
    currentTheme === 'light' || currentTheme === 'dark' ? currentTheme : null;

  // Reset to system theme if it's a new day or first visit
  if (!normalized || shouldResetTheme()) {
    markThemeReset();
    return detectSystemTheme();
  }

  return normalized;
}
