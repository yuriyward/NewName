/**
 * Tab resolution utilities for confirm toast targeting.
 */
import type { SendMessageOptions } from '@webext-core/messaging';
import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';

/**
 * Extract tab ID from a target (either number or SendMessageOptions)
 */
export function extractTabId(
  target: number | SendMessageOptions | undefined,
): number | undefined {
  if (typeof target === 'number') {
    return target;
  }
  if (target && typeof target === 'object' && 'tabId' in target) {
    return target.tabId;
  }
  return undefined;
}

/**
 * Resolve the active tab to use as the target for displaying a toast.
 * Returns the tab ID if found, or undefined if unable to resolve.
 */
export async function resolveTarget(
  preferred?: number | SendMessageOptions,
): Promise<number | SendMessageOptions | undefined> {
  const preferredTabId = extractTabId(preferred);
  if (preferredTabId !== undefined) {
    try {
      const tab = await browser.tabs.get(preferredTabId);
      if (tab?.id !== undefined) {
        return preferred;
      }
    } catch (error) {
      debugLogger.warn(
        '[ConfirmToast] Preferred tab unavailable, falling back to active tab',
        {
          tabId: preferredTabId,
          error,
        },
      );
    }
  }

  try {
    const [activeTab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (activeTab?.id !== undefined) {
      return activeTab.id;
    }
  } catch (error) {
    debugLogger.warn(
      '[ConfirmToast] Unable to resolve active tab target',
      error,
    );
  }

  return undefined;
}
