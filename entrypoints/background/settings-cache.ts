/**
 * Settings cache management for background service worker
 */
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  getLastKnownSettings,
  getSettings,
  type SettingsV1,
  subscribeSettings,
} from '@/entrypoints/shared/settings/settings';

/**
 * Initialize a cached settings reader that automatically updates when settings change.
 * Returns a function that always returns the current settings synchronously.
 */
export function ensureSettingsCache(): () => SettingsV1 {
  let current: SettingsV1 = getLastKnownSettings();

  // Initialize debug logger with current settings
  debugLogger.setEnabled(current.debug.enabled);
  debugLogger.setLevel(current.debug.level);

  void getSettings().then((settings) => {
    current = settings;
    debugLogger.setEnabled(settings.debug.enabled);
    debugLogger.setLevel(settings.debug.level);
  });
  subscribeSettings((settings) => {
    current = settings;
    debugLogger.setEnabled(settings.debug.enabled);
    debugLogger.setLevel(settings.debug.level);
  });
  return () => current;
}
