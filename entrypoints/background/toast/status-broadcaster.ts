/**
 * Status broadcasting utilities for confirm toast updates.
 */

import type { SendMessageOptions } from '@webext-core/messaging';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { sendConfirmToastStatus } from '@/entrypoints/shared/messaging/core-messages';
import type {
  ConfirmToastProposal,
  ConfirmToastStatusState,
} from '@/entrypoints/shared/toast/types';

export interface StatusBroadcastEntry {
  proposal: ConfirmToastProposal;
  visibleOnTabs?: Set<number>;
  target?: number | SendMessageOptions;
}

/**
 * Emit status update to all tabs that have received this toast.
 * Broadcasts the status message to all tracked tabs in parallel.
 * If no tabs are tracked, falls back to sending to the original target.
 */
export async function emitStatus(
  entry: StatusBroadcastEntry,
  state: ConfirmToastStatusState,
  message?: string,
): Promise<void> {
  const statusMessage = {
    toastId: entry.proposal.toastId,
    state,
    message,
  };

  // Send status update to all tabs that have received this toast
  const tabIds = entry.visibleOnTabs || new Set();

  // If no tabs are tracked but we have a target, fall back to sending to the target
  // This handles cases where the toast was shown but tabs weren't properly tracked
  if (tabIds.size === 0 && entry.target !== undefined) {
    debugLogger.log(
      '[ConfirmToast] No tracked tabs, falling back to original target',
      {
        toastId: entry.proposal.toastId,
        target: entry.target,
      },
    );
    try {
      await sendConfirmToastStatus(statusMessage, entry.target);
    } catch (error) {
      debugLogger.warn(
        '[ConfirmToast] Failed to send status to fallback target',
        {
          toastId: entry.proposal.toastId,
          error,
        },
      );
    }
    return;
  }

  if (tabIds.size === 0) {
    debugLogger.warn(
      '[ConfirmToast] No tabs tracked and no target available for status broadcast',
      {
        toastId: entry.proposal.toastId,
        state,
      },
    );
    return;
  }

  // Broadcast to all tracked tabs
  const promises = Array.from(tabIds).map(async (tabId) => {
    try {
      await sendConfirmToastStatus(statusMessage, tabId);
    } catch (error) {
      // This is expected to fail for tabs that were closed or navigated to restricted URLs
      debugLogger.log(
        '[ConfirmToast] Failed to send status to tab (may be closed or restricted)',
        tabId,
        error,
      );
    }
  });

  await Promise.all(promises);
}
