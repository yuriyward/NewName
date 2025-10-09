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
export async function resolveTarget(): Promise<
  number | SendMessageOptions | undefined
> {
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
