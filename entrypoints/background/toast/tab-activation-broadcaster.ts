/**
 * Tab activation broadcaster for re-displaying pending toasts on newly active tabs.
 */
import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { sendShowConfirmToast } from '@/entrypoints/shared/messaging/extension-messaging';
import { isUrlEligibleForContentScript } from '@/entrypoints/shared/utils/tab-eligibility';
import type { ConfirmToastController } from './confirmation-controller';

export interface TabActivationBroadcaster {
  /**
   * Register the browser.tabs.onActivated listener to broadcast pending toasts.
   */
  registerListener(): void;
}

/**
 * Create a tab activation broadcaster that re-displays pending toasts
 * when users switch to a new tab.
 *
 * @param controller - The confirm toast controller to query for pending toasts
 * @returns Tab activation broadcaster instance
 */
export function createTabActivationBroadcaster(
  controller: ConfirmToastController,
): TabActivationBroadcaster {
  return {
    registerListener() {
      browser.tabs.onActivated.addListener(async (activeInfo) => {
        const pendingToasts = controller.getAllPending();
        if (pendingToasts.length === 0) return;

        // Check if the activated tab is eligible for content script injection
        try {
          const tab = await browser.tabs.get(activeInfo.tabId);
          if (!isUrlEligibleForContentScript(tab.url)) {
            // Silently skip restricted tabs (chrome://, about:, etc.)
            debugLogger.log(
              '[ConfirmToast] Skipping restricted tab on activation',
              {
                tabId: activeInfo.tabId,
                url: tab.url,
              },
            );
            return;
          }
        } catch (error) {
          // Tab may have closed or become unavailable
          debugLogger.log('[ConfirmToast] Unable to check tab eligibility', {
            tabId: activeInfo.tabId,
            error,
          });
          return;
        }

        // Send all pending toasts to the newly active tab
        for (const entry of pendingToasts) {
          void sendShowConfirmToast(
            { proposal: entry.proposal },
            activeInfo.tabId,
          )
            .then(() => {
              // Track that this tab has received the toast
              if (entry.visibleOnTabs) {
                entry.visibleOnTabs.add(activeInfo.tabId);
              }
            })
            .catch((error) => {
              // This should be rare now that we check eligibility first
              debugLogger.log(
                '[ConfirmToast] Failed to broadcast toast to tab',
                activeInfo.tabId,
                error,
              );
            });
        }
      });
    },
  };
}
