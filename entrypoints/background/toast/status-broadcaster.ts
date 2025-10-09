/**
 * Status broadcasting utilities for confirm toast updates.
 */
import { sendConfirmToastStatus } from '@/entrypoints/shared/messaging/extension-messaging';
import type {
  ConfirmToastProposal,
  ConfirmToastStatusState,
} from '@/entrypoints/shared/toast/types';

export interface StatusBroadcastEntry {
  proposal: ConfirmToastProposal;
  visibleOnTabs?: Set<number>;
}

/**
 * Emit status update to all tabs that have received this toast.
 * Broadcasts the status message to all tracked tabs in parallel.
 */
export async function emitStatus(
  entry: StatusBroadcastEntry,
  state: ConfirmToastStatusState,
  message?: string,
): Promise<void> {
  // Send status update to all tabs that have received this toast
  const tabIds = entry.visibleOnTabs || new Set();
  if (tabIds.size === 0) return;

  const statusMessage = {
    toastId: entry.proposal.toastId,
    state,
    message,
  };

  // Broadcast to all tracked tabs
  const promises = Array.from(tabIds).map(async (tabId) => {
    try {
      await sendConfirmToastStatus(statusMessage, tabId);
    } catch (error) {
      console.warn('[ConfirmToast] Failed to send status to tab', tabId, error);
    }
  });

  await Promise.all(promises);
}
