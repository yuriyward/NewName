/**
 * Console helper functions for debugging
 */

import {
  getAiModelTelemetrySnapshot,
  resetAiModelTelemetry,
} from '@/entrypoints/shared/integrations/chrome-ai/telemetry';
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

      // AI telemetry
      getAiModelTelemetry: async () => {
        const snapshot = await getAiModelTelemetrySnapshot();
        const summary = summariseTelemetry(snapshot);
        console.table(summary.modelTotals, [
          'status',
          'downloadStarts',
          'downloadCompletes',
        ]);
        console.table(summary.errorsByModel);
        console.table(summary.pipelineBlocked);
        console.table(summary.pipelineRouted);
        return snapshot;
      },
      resetAiModelTelemetry: () => {
        return resetAiModelTelemetry();
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

  newNameDebug.getAiModelTelemetry()   - Inspect on-device AI telemetry counters
  newNameDebug.resetAiModelTelemetry() - Clear AI telemetry counters

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

function summariseTelemetry(
  snapshot: Awaited<ReturnType<typeof getAiModelTelemetrySnapshot>>,
): {
  modelTotals: Array<{
    model: string;
    status: string;
    downloadStarts: number;
    downloadCompletes: number;
  }>;
} & {
  errorsByModel: Array<{ model: string; errorCode: string; count: number }>;
} & {
  pipelineBlocked: Array<{ key: string; count: number }>;
} & {
  pipelineRouted: Array<{ source: string; count: number }>;
} {
  const modelTotals = Object.entries(snapshot.statusTransitions).map(
    ([model, counters]) => ({
      model,
      status:
        Object.entries(counters)
          .filter(([, value]) => value > 0)
          .map(([state, value]) => `${state}:${value}`)
          .join(', ') || 'none',
      downloadStarts:
        snapshot.downloadStarts[
          model as keyof typeof snapshot.downloadStarts
        ] ?? 0,
      downloadCompletes:
        snapshot.downloadCompletes[
          model as keyof typeof snapshot.downloadCompletes
        ] ?? 0,
    }),
  );

  const errorsByModel = Object.entries(snapshot.errors).flatMap(
    ([model, errors]) =>
      Object.entries(errors).map(([errorCode, count]) => ({
        model,
        errorCode,
        count,
      })),
  );

  const pipelineBlocked = Object.entries(snapshot.pipelineBlocked).map(
    ([key, count]) => ({ key, count }),
  );

  const pipelineRouted = Object.entries(snapshot.pipelineRouted).map(
    ([source, count]) => ({ source, count }),
  );

  return { modelTotals, errorsByModel, pipelineBlocked, pipelineRouted };
}
