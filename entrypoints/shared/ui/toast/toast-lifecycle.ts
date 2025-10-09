/**
 * Toast lifecycle management utilities for timer and removal handling.
 */
import { TOAST_TIMING } from '@/entrypoints/shared/toast/timing-constants';
import type { RenameToastState } from './rename-toast';

export type RenameRemovalCallback = () => void;
export type RenameToastStateMap = Map<string, RenameToastState>;

/**
 * Creates a lifecycle manager for handling toast removal timers and rename toast animations.
 */
export function createToastLifecycleManager() {
  const removalTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let renameTicker: ReturnType<typeof setInterval> | undefined;

  function clearRemovalTimer(toastId: string): void {
    const timer = removalTimers.get(toastId);
    if (timer) {
      clearTimeout(timer);
      removalTimers.delete(toastId);
    }
  }

  function scheduleRemoval(
    toastId: string,
    delay: number,
    onRemove: RenameRemovalCallback,
  ): void {
    clearRemovalTimer(toastId);
    if (delay <= 0) {
      onRemove();
      return;
    }
    const timer = setTimeout(() => {
      removalTimers.delete(toastId);
      onRemove();
    }, delay);
    removalTimers.set(toastId, timer);
  }

  function startRenameTicker(
    renameToasts: RenameToastStateMap,
    onUpdate: () => void,
  ): void {
    if (renameTicker) return;
    renameTicker = setInterval(() => {
      if (renameToasts.size === 0) {
        stopRenameTicker();
        return;
      }
      const now = Date.now();
      let updated = false;
      for (const toast of renameToasts.values()) {
        if (toast.paused || toast.dismissAt === null) continue;
        const nextRemaining = Math.max(0, toast.dismissAt - now);
        if (
          Math.abs(nextRemaining - toast.remainingMs) >
          TOAST_TIMING.PROGRESS_UPDATE_THRESHOLD_MS
        ) {
          toast.remainingMs = nextRemaining;
          updated = true;
        }
      }
      if (updated) {
        onUpdate();
      }
    }, TOAST_TIMING.RENAME_TICK_INTERVAL_MS);
  }

  function stopRenameTicker(): void {
    if (!renameTicker) return;
    clearInterval(renameTicker);
    renameTicker = undefined;
  }

  function pauseRenameToast(
    toastId: string,
    renameToasts: RenameToastStateMap,
  ): boolean {
    const toast = renameToasts.get(toastId);
    if (!toast || toast.paused) return false;
    if (toast.dismissAt !== null) {
      toast.remainingMs = Math.max(0, toast.dismissAt - Date.now());
    }
    toast.dismissAt = null;
    toast.paused = true;
    clearRemovalTimer(toastId);
    return true;
  }

  function resumeRenameToast(
    toastId: string,
    renameToasts: RenameToastStateMap,
  ): { shouldSchedule: boolean; remaining: number } | null {
    const toast = renameToasts.get(toastId);
    if (!toast || !toast.paused) return null;
    toast.paused = false;
    const remaining = Math.max(0, toast.remainingMs);
    toast.dismissAt = Date.now() + remaining;
    return { shouldSchedule: true, remaining };
  }

  function destroy(): void {
    for (const timer of removalTimers.values()) {
      clearTimeout(timer);
    }
    removalTimers.clear();
    stopRenameTicker();
  }

  return {
    scheduleRemoval,
    clearRemovalTimer,
    startRenameTicker,
    stopRenameTicker,
    pauseRenameToast,
    resumeRenameToast,
    destroy,
  };
}
