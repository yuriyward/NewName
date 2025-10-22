import { useEffect, useMemo, useState } from 'react';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  AI_MODEL_IDS,
  type AiModelId,
  type AiModelState,
  type AiModelStatusMap,
  refreshAiModelStatuses,
  subscribeAiModelStatuses,
} from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import {
  type AiModelSetupState,
  getAiModelSetupState,
  subscribeAiModelSetupState,
} from '@/entrypoints/shared/integrations/chrome-ai/setup-state';

interface UseAiModelStatusResult {
  aiStatuses: AiModelStatusMap | null;
  aiStatusChecked: boolean;
  aiStatusError: string | null;
  aiSetupCompletedAt: number | null;
  aiLastSetupError: AiModelSetupState['lastError'] | null;
  aiBlockingModels: AiModelId[];
}

export const useAiModelStatus = (): UseAiModelStatusResult => {
  const [aiStatuses, setAiStatuses] = useState<AiModelStatusMap | null>(null);
  const [aiStatusChecked, setAiStatusChecked] = useState(false);
  const [aiStatusError, setAiStatusError] = useState<string | null>(null);
  const [aiSetupState, setAiSetupState] = useState<AiModelSetupState | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const statuses = await refreshAiModelStatuses();
        if (!active) return;
        setAiStatuses(statuses);
      } catch (err) {
        if (!active) return;
        setAiStatusError(describeError(err));
      } finally {
        if (active) {
          setAiStatusChecked(true);
        }
      }

      try {
        unsubscribe = await subscribeAiModelStatuses((next) => {
          if (!active) return;
          setAiStatuses(next);
        });
      } catch (err) {
        if (!active) return;
        setAiStatusError((prev) => prev ?? describeError(err));
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const state = await getAiModelSetupState();
        if (!active) return;
        setAiSetupState(state);
      } catch (err) {
        if (!active) return;
        debugLogger.warn('Failed to load AI model setup state', {
          error: err,
        });
      }

      try {
        unsubscribe = await subscribeAiModelSetupState((next) => {
          if (!active) return;
          setAiSetupState(next);
        });
      } catch (err) {
        if (!active) return;
        debugLogger.warn('Failed to subscribe AI model setup state', {
          error: err,
        });
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const aiBlockingModels = useMemo(() => {
    if (!aiStatuses) return [];
    return AI_MODEL_IDS.filter((id) => {
      const state = aiStatuses[id].state;
      return state !== 'available' && state !== 'unsupported';
    });
  }, [aiStatuses]);

  return {
    aiStatuses,
    aiStatusChecked,
    aiStatusError,
    aiSetupCompletedAt: aiSetupState?.setupCompletedAt ?? null,
    aiLastSetupError: aiSetupState?.lastError ?? null,
    aiBlockingModels,
  };
};

export function describeAiState(state: AiModelState): string {
  switch (state) {
    case 'available':
      return 'ready';
    case 'downloadable':
      return 'download required';
    case 'downloading':
      return 'downloading';
    case 'unavailable':
      return 'unavailable on this device';
    case 'unsupported':
      return 'unsupported in this Chrome version';
    case 'error':
      return 'error';
    default:
      return 'checking...';
  }
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
