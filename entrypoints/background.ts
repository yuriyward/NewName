/**
 * Background service worker for download interception and renaming
 */
import { browser } from 'wxt/browser';
import { initializeBackgroundDebug } from '@/entrypoints/shared/debug/console-helpers';
import { logMediaDebug } from '@/entrypoints/shared/integrations/mediainfo/debug';
import { registerInstallDateListener } from '@/entrypoints/shared/lifecycle/install-tracking';
import { onExtensionMessage } from '@/entrypoints/shared/messaging/extension-messaging';
import { registerPageContextService } from '@/entrypoints/shared/state/page-context-service';
import { createDeterminingListener } from './background/download-coordinator';
import {
  type DownloadTrackingEntry,
  pruneDownloadTrackingMap,
} from './background/download-tracking';
import { ensureSettingsCache } from './background/settings-cache';

const readSettings = ensureSettingsCache();

const PAGE_CONTEXT_PRUNE_INTERVAL_MS = 5 * 60_000;
const DOWNLOAD_TRACKING_PRUNE_INTERVAL_MS = 15 * 60_000;

const downloadTracking = new Map<number, DownloadTrackingEntry>();

function initializeBackground(): void {
  registerInstallDateListener();
  initializeBackgroundDebug();

  const pageContextService = registerPageContextService();

  onExtensionMessage('resolveRuntimeContext', ({ sender }) => ({
    tabId: sender.tab?.id ?? undefined,
    frameId: sender.frameId,
    url: sender.url ?? sender.tab?.url ?? null,
  }));

  browser.tabs.onRemoved.addListener((tabId) => {
    void pageContextService.clear(tabId);
  });

  browser.downloads.onChanged.addListener((delta) => {
    const info = downloadTracking.get(delta.id);
    if (!info) return;

    const state = delta.state?.current;
    if (state === 'complete' || state === 'interrupted') {
      downloadTracking.delete(delta.id);

      void browser.downloads
        .search({ id: delta.id })
        .then(([item]) => {
          if (!item) {
            console.warn('[NewName] download info missing for id', delta.id);
            return;
          }

          const payload = {
            downloadId: delta.id,
            historyId: info.historyId,
            state,
            totalBytes:
              item.totalBytes !== undefined && item.totalBytes >= 0
                ? item.totalBytes
                : undefined,
            bytesReceived: item.bytesReceived,
            filename: item.filename ?? info.filename,
            url: info.url,
          };

          logMediaDebug(info.debug, 'download-bytes-final', payload);
        })
        .catch((error) => {
          console.error('Failed to log download bytes', error);
        });
    }
  });

  browser.downloads.onDeterminingFilename.addListener(
    createDeterminingListener(
      pageContextService,
      readSettings,
      downloadTracking,
    ),
  );

  setInterval(() => {
    pruneDownloadTrackingMap(downloadTracking);
  }, DOWNLOAD_TRACKING_PRUNE_INTERVAL_MS);

  setInterval(() => {
    void pageContextService.prune();
  }, PAGE_CONTEXT_PRUNE_INTERVAL_MS);

  const settings = readSettings();
  if (settings.debug.enabled) {
    console.log('[NewName Debug] Background ready', { id: browser.runtime.id });
  }
}

export default defineBackground(() => {
  initializeBackground();
});
