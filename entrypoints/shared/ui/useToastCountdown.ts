/**
 * Countdown timer hooks for auto-apply toast
 */

import { useEffect, useRef, useState } from 'react';
import { sendConfirmToastCountdownControl } from '@/entrypoints/shared/messaging/core-messages';
import { TOAST_TIMING } from '@/entrypoints/shared/toast/timing-constants';

/**
 * Compute countdown seconds from timestamp or remaining milliseconds
 */
export function computeCountdownSeconds(
  autoApplyAt: number | null,
  remainingMs: number | null,
): number | null {
  if (autoApplyAt !== null) {
    const diff = autoApplyAt - Date.now();
    if (!Number.isFinite(diff)) return null;
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
  }
  if (remainingMs === null || !Number.isFinite(remainingMs)) return null;
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

/**
 * Format countdown seconds to display string
 */
export function formatCountdown(seconds: number | null): string {
  if (seconds === null) return '';
  if (seconds <= 0) return '0s';
  return `${seconds}s`;
}

interface UseToastCountdownParams {
  allowAutoApply: boolean;
  autoApplyAt: number | null;
  autoApplyRemainingMs: number | null;
  status: string;
  toastId: string;
}

/**
 * Hook to manage countdown timer state and pause/resume functionality
 * Handles interval updates and pause/resume messaging to background
 */
export function useToastCountdown({
  allowAutoApply,
  autoApplyAt,
  autoApplyRemainingMs,
  status,
  toastId,
}: UseToastCountdownParams) {
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(() =>
    computeCountdownSeconds(autoApplyAt, autoApplyRemainingMs),
  );
  const hoverStateRef = useRef<'running' | 'paused'>('running');

  useEffect(() => {
    if (!allowAutoApply || status !== 'pending') {
      setCountdownSeconds(null);
      hoverStateRef.current = 'running';
      return;
    }

    const updateCountdown = () => {
      setCountdownSeconds(
        computeCountdownSeconds(autoApplyAt, autoApplyRemainingMs),
      );
    };

    updateCountdown();

    if (autoApplyAt === null) {
      hoverStateRef.current = 'paused';
      return;
    }

    hoverStateRef.current = 'running';
    const interval = setInterval(
      updateCountdown,
      TOAST_TIMING.COUNTDOWN_TICK_INTERVAL_MS,
    );

    return () => clearInterval(interval);
  }, [allowAutoApply, autoApplyAt, autoApplyRemainingMs, status]);

  useEffect(() => {
    return () => {
      if (!allowAutoApply || status !== 'pending') return;
      if (hoverStateRef.current !== 'paused') return;

      hoverStateRef.current = 'running';
      void sendConfirmToastCountdownControl({
        toastId,
        action: 'resume',
      }).catch((error) => {
        hoverStateRef.current = 'paused';
        console.warn(
          '[ConfirmToast] Failed to resume auto-apply countdown',
          error,
        );
      });
    };
  }, [allowAutoApply, status, toastId]);

  const pauseCountdown = () => {
    if (!allowAutoApply || status !== 'pending') return;
    if (hoverStateRef.current === 'paused') return;

    hoverStateRef.current = 'paused';
    void sendConfirmToastCountdownControl({
      toastId,
      action: 'pause',
    }).catch((error) => {
      hoverStateRef.current = 'running';
      console.warn(
        '[ConfirmToast] Failed to pause auto-apply countdown',
        error,
      );
    });
  };

  const resumeCountdown = () => {
    if (!allowAutoApply || status !== 'pending') return;
    if (hoverStateRef.current === 'running') return;

    hoverStateRef.current = 'running';
    void sendConfirmToastCountdownControl({
      toastId,
      action: 'resume',
    }).catch((error) => {
      hoverStateRef.current = 'paused';
      console.warn(
        '[ConfirmToast] Failed to resume auto-apply countdown',
        error,
      );
    });
  };

  const isCountdownPaused =
    allowAutoApply &&
    status === 'pending' &&
    autoApplyAt === null &&
    autoApplyRemainingMs !== null;

  const countdownAnnouncement =
    !allowAutoApply || countdownSeconds === null || status !== 'pending'
      ? null
      : isCountdownPaused
        ? `Auto-apply paused at ${countdownSeconds} seconds`
        : countdownSeconds <= 0
          ? 'Auto-apply happening now'
          : `Auto-apply in ${countdownSeconds} seconds`;

  return {
    countdownSeconds,
    countdownAnnouncement,
    isCountdownPaused,
    pauseCountdown,
    resumeCountdown,
  };
}
