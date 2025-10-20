/**
 * Action handler for user interactions with toasts.
 */
import { sendConfirmToastDecision } from '@/entrypoints/shared/messaging/core-messages';
import type {
  ConfirmToastAction,
  ConfirmToastDecisionMessage,
  ConfirmToastState,
} from '@/entrypoints/shared/toast/types';

export interface ActionHandlerCallbacks {
  onRenderNeeded: () => void;
}

/**
 * Creates an action handler for toast user interactions.
 */
export function createToastActionHandler(callbacks: ActionHandlerCallbacks) {
  async function sendAction(
    toast: ConfirmToastState,
    action: ConfirmToastAction,
    edited?: string,
  ): Promise<void> {
    if (toast.resolving) return;
    toast.resolving = true;
    toast.status = 'pending';
    toast.statusMessage = undefined;
    callbacks.onRenderNeeded();

    const payload: ConfirmToastDecisionMessage = {
      toastId: toast.toastId,
      historyId: toast.historyId,
      downloadId: toast.downloadId,
      action,
    };

    const trimmedName = edited?.trim();
    if (
      trimmedName &&
      trimmedName.length > 0 &&
      trimmedName !== toast.proposedFilename
    ) {
      payload.editedFilename = trimmedName;
    }

    try {
      await sendConfirmToastDecision(payload);
    } catch (error) {
      toast.resolving = false;
      toast.status = 'error';
      toast.statusMessage =
        error instanceof Error
          ? error.message
          : 'Failed to send decision. Please try again.';
      callbacks.onRenderNeeded();
    }
  }

  return {
    sendAction,
  };
}
