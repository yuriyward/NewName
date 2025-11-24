import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { SystemDiagnostics } from '@/entrypoints/shared/integrations/chrome-ai/diagnostics';
import { runDiagnostics } from '@/entrypoints/shared/integrations/chrome-ai/diagnostics';
import type {
  AiModelId,
  AiModelProgressEvent,
  AiModelStatusMap,
} from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import type { ModelProgress, StatusSnapshot } from './types';
import { describeError } from './utils';

export function createProgressHandler(
  setProgress: React.Dispatch<
    React.SetStateAction<Record<AiModelId, ModelProgress>>
  >,
): (event: AiModelProgressEvent) => void {
  return (event: AiModelProgressEvent) => {
    setProgress((previous) => {
      const next = { ...previous };
      const modelState = { ...next[event.id] };
      switch (event.type) {
        case 'status':
          if (event.status === 'available') {
            modelState.completed = true;
            modelState.started = true;
          }
          break;
        case 'download-start':
          modelState.started = true;
          modelState.error = undefined;
          modelState.errorCode = undefined;
          break;
        case 'download-progress':
          modelState.started = true;
          modelState.loaded = event.loaded;
          modelState.total = event.total;
          break;
        case 'complete':
          modelState.completed = true;
          break;
        case 'error':
          modelState.error = event.error;
          modelState.errorCode = event.errorCode;
          break;
        default:
          break;
      }
      next[event.id] = modelState;
      return next;
    });
  };
}

export async function createRefreshAfterRun(
  snapshot: StatusSnapshot,
  refreshAiModelStatuses: (
    ids?: readonly AiModelId[],
  ) => Promise<AiModelStatusMap>,
  setSnapshot: (snapshot: StatusSnapshot) => void,
  setLoadError: (error: string | null) => void,
): Promise<(modelId: AiModelId) => Promise<void>> {
  return async (modelId: AiModelId) => {
    try {
      // Only refresh the model we just downloaded to avoid race conditions
      // with other models while Chrome is still processing
      const refreshed = await refreshAiModelStatuses([modelId]);
      setSnapshot({ statuses: refreshed, lastUpdated: Date.now() });

      // Merge refreshed status with existing snapshot to get complete state
      const currentStatuses = { ...snapshot.statuses, ...refreshed };

      // Reload when Prompt API + Summarizer are ready (ignore language-detector)
      // This ensures we work with fresh state for all models
      const mainModelsReady =
        (currentStatuses['language-model']?.state === 'available' ||
          currentStatuses['language-model']?.state === 'unsupported') &&
        (currentStatuses.summarizer?.state === 'available' ||
          currentStatuses.summarizer?.state === 'unsupported');

      // Auto-reload to get fresh state for all models
      if (mainModelsReady) {
        window.location.reload();
      }
    } catch (error) {
      setLoadError(describeError(error));
    }
  };
}

export async function handleRunDiagnostics(
  statuses: AiModelStatusMap,
  setDiagnostics: (diagnostics: SystemDiagnostics | null) => void,
  setRunningDiagnostics: (running: boolean) => void,
): Promise<void> {
  setRunningDiagnostics(true);
  try {
    const results = await runDiagnostics(statuses);
    setDiagnostics(results);
  } catch (error) {
    debugLogger.warn('[AISetupPage] Diagnostics failed', { error });
  } finally {
    setRunningDiagnostics(false);
  }
}
