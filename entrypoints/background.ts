/**
 * Background service worker for download interception and renaming
 */
import { browser } from 'wxt/browser';
import { initializeBackgroundDebug } from '@/entrypoints/shared/debug/console-helpers';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { logMediaDebug } from '@/entrypoints/shared/integrations/mediainfo/debug';
import { registerInstallDateListener } from '@/entrypoints/shared/lifecycle/install-tracking';
import {
  onExtensionMessage,
  sendShowConfirmToast,
} from '@/entrypoints/shared/messaging/extension-messaging';
import { updateSettings } from '@/entrypoints/shared/settings/settings';
import { registerPageContextService } from '@/entrypoints/shared/state/page-context-service';
import { createDeterminingListener } from './background/download-coordinator';
import {
  type DownloadTrackingEntry,
  pruneDownloadTrackingMap,
} from './background/download-tracking';
import {
  executeAlwaysApply,
  executeApply,
  executeKeep,
} from './background/rename-orchestrator';
import { ensureSettingsCache } from './background/settings-cache';
import { createConfirmToastController } from './background/toast/confirmation-controller';

const readSettings = ensureSettingsCache();

const PAGE_CONTEXT_PRUNE_INTERVAL_MS = 5 * 60_000;
const DOWNLOAD_TRACKING_PRUNE_INTERVAL_MS = 15 * 60_000;

const downloadTracking = new Map<number, DownloadTrackingEntry>();

function initializeBackground(): void {
  const confirmToastController = createConfirmToastController({
    async onUserDecision(entry, decision, helpers) {
      debugLogger.log(
        '[ConfirmToast] Received user decision',
        decision.action,
        entry.proposal.historyId,
      );
      const orchestratorHelpers = {
        emitStatus: helpers.emitStatus,
      };

      try {
        switch (decision.action) {
          case 'approve':
            await executeApply(entry, decision, orchestratorHelpers);
            break;
          case 'keep-original':
            await executeKeep(entry, orchestratorHelpers);
            break;
          case 'always-apply':
            await executeAlwaysApply(entry, decision, orchestratorHelpers);
            break;
          default:
            debugLogger.warn(
              '[ConfirmToast] Unknown action received',
              decision.action,
            );
            await helpers.emitStatus('dismissed');
        }
      } catch (error) {
        debugLogger.error(
          '[ConfirmToast] Failed to process user decision',
          error,
        );
        await helpers.emitStatus(
          'error',
          error instanceof Error ? error.message : String(error),
        );
      }
    },
    async onAutoApply(entry, helpers) {
      debugLogger.log(
        '[ConfirmToast] Auto-apply timeout reached',
        entry.proposal.historyId,
      );
      try {
        await executeApply(
          entry,
          {
            toastId: entry.proposal.toastId,
            historyId: entry.historyId,
            downloadId: entry.proposal.downloadId,
            action: 'approve',
          },
          {
            emitStatus: helpers.emitStatus,
          },
        );
      } catch (error) {
        debugLogger.error('[ConfirmToast] Auto-apply rename failed', error);
        await helpers.emitStatus(
          'error',
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  });

  registerInstallDateListener();
  initializeBackgroundDebug();

  const pageContextService = registerPageContextService();

  // void (async () => {
  //   try {
  //     const current = await getSettings();
  //     const desiredDebug = {
  //       ...current.debug,
  //       enabled: true,
  //       level: 'verbose' as const,
  //     };
  //     if (
  //       current.mode !== 'careful' ||
  //       current.debug.enabled !== desiredDebug.enabled ||
  //       current.debug.level !== desiredDebug.level
  //     ) {
  //       await updateSettings({
  //         mode: 'careful',
  //         debug: desiredDebug,
  //       });
  //       console.info(
  //         '[NewName] Dev override: mode set to careful with verbose debug',
  //       );
  //     }
  //   } catch (error) {
  //     console.warn('[NewName] Failed to apply dev settings override', error);
  //   }
  // })();

  void (async () => {
    await updateSettings({
      mode: 'balanced',
      debug: {
        enabled: true,
        level: 'verbose' as const,
      },
    });
  })();

  onExtensionMessage('resolveRuntimeContext', ({ sender }) => ({
    tabId: sender.tab?.id ?? undefined,
    frameId: sender.frameId,
    url: sender.url ?? sender.tab?.url ?? null,
  }));

  onExtensionMessage('syncConfirmToasts', ({ sender }) => {
    const tabId = sender.tab?.id;
    if (typeof tabId !== 'number') {
      return { proposals: [] };
    }

    const proposals = confirmToastController
      .getAllPending()
      .filter((entry) => {
        if (!entry.visibleOnTabs) {
          entry.visibleOnTabs = new Set();
        }
        const target = entry.target;
        const targetTabId =
          typeof target === 'number'
            ? target
            : target && typeof target === 'object' && 'tabId' in target
              ? target.tabId
              : undefined;
        if (entry.visibleOnTabs.has(tabId) || targetTabId === tabId) {
          entry.visibleOnTabs.add(tabId);
          return true;
        }
        return false;
      })
      .map((entry) => entry.proposal);

    return { proposals };
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    void pageContextService.clear(tabId);
  });

  // Re-broadcast pending toasts to newly active tabs
  browser.tabs.onActivated.addListener((activeInfo) => {
    const pendingToasts = confirmToastController.getAllPending();
    if (pendingToasts.length === 0) return;

    // Send all pending toasts to the newly active tab
    for (const entry of pendingToasts) {
      void sendShowConfirmToast({ proposal: entry.proposal }, activeInfo.tabId)
        .then(() => {
          // Track that this tab has received the toast
          if (entry.visibleOnTabs) {
            entry.visibleOnTabs.add(activeInfo.tabId);
          }
        })
        .catch((error) => {
          debugLogger.warn(
            '[ConfirmToast] Failed to broadcast toast to tab',
            activeInfo.tabId,
            error,
          );
        });
    }
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
            debugLogger.warn(
              '[NewName] download info missing for id',
              delta.id,
            );
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
      confirmToastController,
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

  onExtensionMessage('confirmToastDecision', async ({ data }) => {
    const handled = await confirmToastController.handleUserDecision(data);
    if (!handled) {
      debugLogger.warn(
        '[ConfirmToast] Unmatched decision for toast',
        data.toastId,
      );
    }
    return { ok: true };
  });
}

export default defineBackground(() => {
  initializeBackground();
});
