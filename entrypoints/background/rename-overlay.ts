/**
 * Helper for sending rename-complete overlay notifications to the initiating tab.
 */
import type { SendMessageOptions } from '@webext-core/messaging';
import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { sendShowRenameToast } from '@/entrypoints/shared/messaging/extension-messaging';
import {
  DEFAULT_SETTINGS,
  type Settings,
} from '@/entrypoints/shared/settings/types';

export interface RenameOverlayOptions {
  settings: Settings;
  tabId?: number;
  frameId?: number;
  originalFilename: string;
  finalFilename: string;
  downloadId?: string;
  kind?: 'instant-baseline' | 'contextual-upgrade';
}

async function resolveTarget(
  tabId?: number,
  frameId?: number,
): Promise<SendMessageOptions | number | undefined> {
  if (typeof tabId === 'number' && Number.isFinite(tabId)) {
    if (typeof frameId === 'number' && Number.isFinite(frameId)) {
      return { tabId, frameId };
    }
    return tabId;
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
      '[NewName] Unable to resolve active tab for rename overlay',
      error,
    );
  }
  return undefined;
}

export async function maybeShowRenameOverlay(
  options: RenameOverlayOptions,
): Promise<void> {
  const {
    settings,
    tabId,
    frameId,
    originalFilename,
    finalFilename,
    downloadId,
  } = options;

  const kind = options.kind ?? 'instant-baseline';
  const renameDurationSeconds =
    settings.confirmToast?.renameToastDurationSeconds ??
    DEFAULT_SETTINGS.confirmToast.renameToastDurationSeconds;
  const durationMs = Math.max(0, Math.round(renameDurationSeconds * 1000));
  const overlayEnabled = (() => {
    const renameNotifications =
      settings.confirmToast?.renameNotifications ??
      DEFAULT_SETTINGS.confirmToast.renameNotifications;
    if (kind === 'contextual-upgrade') {
      const contextual = renameNotifications?.contextualUpgrade;
      return typeof contextual === 'boolean'
        ? contextual
        : DEFAULT_SETTINGS.confirmToast.renameNotifications.contextualUpgrade;
    }
    const instant = renameNotifications?.instantBaseline;
    return typeof instant === 'boolean'
      ? instant
      : DEFAULT_SETTINGS.confirmToast.renameNotifications.instantBaseline;
  })();

  if (!overlayEnabled) return;
  if (settings.mode === 'silent') return;

  const target = await resolveTarget(tabId, frameId);
  if (target === undefined) {
    // Without a tab we cannot render the overlay; silently skip for now.
    debugLogger.warn(
      '[NewName] Skipping rename overlay, no tab target available',
    );
    return;
  }

  const createdAt = Date.now();

  try {
    debugLogger.log('[NewName] dispatching rename overlay', {
      target,
      originalFilename,
      finalFilename,
    });
    await sendShowRenameToast(
      {
        toast: {
          toastId: `rename-${downloadId ?? createdAt.toString(36)}`,
          createdAt,
          originalFilename,
          finalFilename,
          downloadId,
          durationMs,
        },
      },
      target,
    );
  } catch (error) {
    debugLogger.warn('[NewName] Failed to show rename overlay', error);
  }
}
