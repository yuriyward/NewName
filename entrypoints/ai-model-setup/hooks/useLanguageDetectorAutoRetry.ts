import { useEffect, useRef } from 'react';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  type AiModelStatus,
  refreshAiModelStatuses,
} from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import { AUTO_RETRY_BUDGET_MS, AUTO_RETRY_INTERVAL_MS } from '../constants';
import type { StatusSnapshot } from '../types';
import { isInitializationPending } from '../utils';

interface UseLanguageDetectorAutoRetryOptions {
  /** Current language-detector model status */
  status: AiModelStatus;
  /** Whether language-detector is currently being downloaded */
  isDownloading: boolean;
  /** Callback when status is refreshed */
  onStatusRefresh: (snapshot: StatusSnapshot) => void;
  /** Interval between retries in milliseconds (default: 4000) */
  retryIntervalMs?: number;
  /** Total time budget for retries in milliseconds (default: 60000) */
  retryBudgetMs?: number;
}

/**
 * Auto-retry hook for language-detector model initialization.
 *
 * Automatically polls the language-detector status when Chrome reports
 * "InitializationPending" errors. Retries every 4 seconds for up to 60 seconds.
 *
 * This handles the case where Chrome needs time to initialize the model after
 * other models complete downloading.
 *
 * @example
 * ```tsx
 * const languageDetectorStatus = snapshot.statuses['language-detector'];
 *
 * useLanguageDetectorAutoRetry({
 *   status: languageDetectorStatus,
 *   isDownloading: activeModelId === 'language-detector',
 *   onStatusRefresh: setSnapshot,
 * });
 * ```
 */
export function useLanguageDetectorAutoRetry({
  status,
  isDownloading,
  onStatusRefresh,
  retryIntervalMs = AUTO_RETRY_INTERVAL_MS,
  retryBudgetMs = AUTO_RETRY_BUDGET_MS,
}: UseLanguageDetectorAutoRetryOptions): void {
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const isPending = isInitializationPending(status);
    const isReady =
      status.state === 'available' || status.state === 'unsupported';

    // Cleanup: Clear timer and reset when conditions no longer require retry
    if (!isPending || isReady || isDownloading) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      startTimeRef.current = null;
      return;
    }

    // Initialize start time on first pending detection
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    // Budget check: Stop retrying after time limit
    const elapsed = Date.now() - startTimeRef.current;
    if (elapsed >= retryBudgetMs) {
      return;
    }

    // Prevent duplicate timers
    if (timerRef.current) return;

    // Schedule next retry
    timerRef.current = window.setTimeout(async () => {
      timerRef.current = null;
      try {
        const refreshed = await refreshAiModelStatuses(['language-detector']);
        onStatusRefresh({ statuses: refreshed, lastUpdated: Date.now() });
      } catch (error) {
        debugLogger.warn('[LanguageDetectorAutoRetry] Refresh failed', {
          error,
        });
      }
    }, retryIntervalMs);

    // Cleanup function: Called when effect re-runs or component unmounts
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, isDownloading, onStatusRefresh, retryIntervalMs, retryBudgetMs]);
}
