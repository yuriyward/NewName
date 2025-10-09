/**
 * State management for confirm and rename toasts.
 */
import type {
  ConfirmToastProposal,
  ConfirmToastRenderState,
  ConfirmToastStatusMessage,
  RenameToastPayload,
} from '@/entrypoints/shared/toast/types';
import type { RenameToastState } from './rename-toast';

export type ToastMap = Map<string, ConfirmToastRenderState>;
export type RenameToastMap = Map<string, RenameToastState>;

export function sortToastsDescending(
  toasts: ToastMap,
): ConfirmToastRenderState[] {
  return Array.from(toasts.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Creates a state manager for toast collections.
 */
export function createToastStateManager() {
  const toasts: ToastMap = new Map();
  const renameToasts: RenameToastMap = new Map();

  function addConfirmToast(proposal: ConfirmToastProposal): void {
    toasts.set(proposal.toastId, {
      ...proposal,
      status: 'pending',
      statusMessage: undefined,
      resolving: false,
    });
  }

  function updateConfirmToastStatus(
    message: ConfirmToastStatusMessage,
  ): ConfirmToastRenderState | null {
    const toast = toasts.get(message.toastId);
    if (!toast) {
      console.warn(
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
    return toasts.delete(toastId);
  }

  function addRenameToast(
    toast: RenameToastPayload,
    duration: number,
  ): RenameToastState {
    const now = Date.now();
    const state: RenameToastState = {
      ...toast,
      durationMs: duration,
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

  function getConfirmToasts(): ConfirmToastRenderState[] {
    return sortToastsDescending(toasts);
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
    toasts,
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
