import { useEffect, useState } from 'react';
import {
  refreshAiModelStatuses,
  subscribeAiModelStatuses,
} from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import { INITIAL_STATUS_MAP } from '../constants';
import type { StatusSnapshot } from '../types';
import { describeError } from '../utils';

export function useModelStatusSubscription() {
  const [snapshot, setSnapshot] = useState<StatusSnapshot>({
    statuses: INITIAL_STATUS_MAP,
    lastUpdated: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const refreshed = await refreshAiModelStatuses();
        if (!active) return;
        setSnapshot({ statuses: refreshed, lastUpdated: Date.now() });
      } catch (error) {
        if (!active) return;
        setLoadError(describeError(error));
      } finally {
        setLoading(false);
      }

      try {
        unsubscribe = await subscribeAiModelStatuses((next) => {
          if (!active) return;
          setSnapshot({ statuses: next, lastUpdated: Date.now() });
        });
      } catch (error) {
        if (!active) return;
        setLoadError((prev) => prev ?? describeError(error));
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  async function handleRefreshStatus(): Promise<void> {
    setLoading(true);
    setLoadError(null);
    try {
      const refreshed = await refreshAiModelStatuses();
      setSnapshot({ statuses: refreshed, lastUpdated: Date.now() });
    } catch (error) {
      setLoadError(describeError(error));
    } finally {
      setLoading(false);
    }
  }

  return {
    snapshot,
    setSnapshot,
    loading,
    setLoading,
    loadError,
    setLoadError,
    now,
    handleRefreshStatus,
  };
}
