/**
 * State management for confirm and rename toasts.
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type {
  ConfirmToastProposal,
  ConfirmToastState,
  ConfirmToastStatusMessage,
  RenameToastProposal,
} from '@/entrypoints/shared/toast/types';
import type { RenameToastState } from './rename-toast';

export type ConfirmToastStateMap = Map<string, ConfirmToastState>;
export type RenameToastStateMap = Map<string, RenameToastState>;

export function sortToastsDescending(
  toasts: ConfirmToastStateMap,
): ConfirmToastState[] {
  return Array.from(toasts.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Creates a state manager for toast collections.
 */
export function createToastStateManager() {
  const confirmToasts: ConfirmToastStateMap = new Map();
  const renameToasts: RenameToastStateMap = new Map();

  function addConfirmToast(proposal: ConfirmToastProposal): void {
    confirmToasts.set(proposal.toastId, {
      ...proposal,
      status: 'pending',
      statusMessage: undefined,
      resolving: false,
    });
  }

  function updateConfirmToastStatus(
    message: ConfirmToastStatusMessage,
  ): ConfirmToastState | null {
    const toast = confirmToasts.get(message.toastId);
    if (!toast) {
      debugLogger.warn(
        '[ConfirmToast] Received status for unknown toast',
        message.toastId,
      );
      return null;
    }
    toast.status = message.state;
    toast.statusMessage = message.message;
    toast.resolving = false;
    return toast;
  }

  function removeConfirmToast(toastId: string): boolean {
    return confirmToasts.delete(toastId);
  }

  function addRenameToast(toast: RenameToastProposal): RenameToastState {
    const now = Date.now();
    const duration = toast.durationMs;
    const state: RenameToastState = {
      ...toast,
      remainingMs: duration,
      dismissAt: now + duration,
      paused: false,
    };
    renameToasts.set(toast.toastId, state);
    return state;
  }

  function removeRenameToast(toastId: string): boolean {
    return renameToasts.delete(toastId);
  }

  function getConfirmToasts(): ConfirmToastState[] {
    return sortToastsDescending(confirmToasts);
  }

  function getRenameToasts(): RenameToastState[] {
    return Array.from(renameToasts.values()).sort(
      (a, b) => b.createdAt - a.createdAt,
    );
  }

  function getRenameToast(toastId: string): RenameToastState | undefined {
    return renameToasts.get(toastId);
  }

  function hasRenameToasts(): boolean {
    return renameToasts.size > 0;
  }

  return {
    confirmToasts,
    renameToasts,
    addConfirmToast,
    updateConfirmToastStatus,
    removeConfirmToast,
    addRenameToast,
    removeRenameToast,
    getConfirmToasts,
    getRenameToasts,
    getRenameToast,
    hasRenameToasts,
  };
}
