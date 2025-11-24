import { useEffect, useState } from 'react';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  type AiModelSetupState,
  getAiModelSetupState,
  subscribeAiModelSetupState,
} from '@/entrypoints/shared/integrations/chrome-ai/setup-state';

export function useSetupStateSubscription() {
  const [setupState, setSetupState] = useState<AiModelSetupState | null>(null);
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [storedLastError, setStoredLastError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const initial = await getAiModelSetupState();
        if (!active) return;
        setSetupState(initial);
        setCompletedAt(initial.setupCompletedAt ?? null);
        setStoredLastError(initial.lastError?.message ?? null);
      } catch (error) {
        if (!active) return;
        debugLogger.warn('[AISetupPage] Failed to load setup state', {
          error,
        });
      }

      try {
        unsubscribe = await subscribeAiModelSetupState((next) => {
          if (!active) return;
          setSetupState(next);
          setCompletedAt(next.setupCompletedAt ?? null);
          setStoredLastError(next.lastError?.message ?? null);
        });
      } catch (error) {
        if (!active) return;
        debugLogger.warn('[AISetupPage] Failed to subscribe setup state', {
          error,
        });
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return {
    setupState,
    completedAt,
    setCompletedAt,
    storedLastError,
    setStoredLastError,
  };
}
