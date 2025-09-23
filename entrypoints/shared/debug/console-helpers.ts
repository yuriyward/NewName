/**
 * Console helper functions for debugging
 */

import {
  getLastKnownSettings,
  updateSettings,
} from '@/entrypoints/shared/settings/settings';
import { debugLogger } from './logger';

/**
 * Global debug helpers attached to window for easy console access
 */
export function attachConsoleHelpers(): void {
  if (typeof globalThis !== 'undefined') {
    const helpers = {
      // Debug mode controls
      enableDebug: (level: 'basic' | 'detailed' | 'verbose' = 'detailed') => {
        return updateSettings({ debug: { enabled: true, level } });
      },
      disableDebug: () => {
        return updateSettings({ debug: { enabled: false, level: 'basic' } });
      },
      getDebugSettings: () => {
        const settings = getLastKnownSettings();
        return settings.debug;
      },

      // Debug data access
      getDebugContexts: () => {
        return debugLogger.getAllContexts();
      },
      getLatestDebugContext: () => {
        const contexts = debugLogger.getAllContexts();
        return contexts[0] || null;
      },

      // Logger controls
      setDebugLevel: (level: 'basic' | 'detailed' | 'verbose') => {
        debugLogger.setLevel(level);
        return updateSettings({ debug: { enabled: true, level } });
      },

      // Utilities
      exportDebugData: () => {
        const contexts = debugLogger.getAllContexts();
        const blob = new Blob([JSON.stringify(contexts, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `newname-debug-${new Date().toISOString().slice(0, 19)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },

      // Help
      debugHelp: () => {
        console.log(`
NewName Debug Console Helpers:

  newNameDebug.enableDebug('verbose')  - Enable debug mode
  newNameDebug.disableDebug()          - Disable debug mode
  newNameDebug.setDebugLevel('basic')  - Change debug level
  newNameDebug.getDebugSettings()      - Show current debug settings

  newNameDebug.getDebugContexts()      - Get all debug data
  newNameDebug.getLatestDebugContext() - Get latest debug session
  newNameDebug.exportDebugData()       - Download debug data as JSON

  newNameDebug.debugHelp()             - Show this help
        `);
      },
    };

    (globalThis as Record<string, unknown>).newNameDebug = helpers;
    console.log('NewName debug helpers available at window.newNameDebug');
    console.log('Type newNameDebug.debugHelp() for available commands');
  }
}

/**
 * Initialize debug helpers in background script
 */
export function initializeBackgroundDebug(): void {
  attachConsoleHelpers();

  // Log debug initialization
  const settings = getLastKnownSettings();
  if (settings.debug.enabled) {
    console.log(`NewName debug mode active (${settings.debug.level})`);
  }
}
