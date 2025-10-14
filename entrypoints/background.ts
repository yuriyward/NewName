/**
 * Background service worker for download interception and renaming
 */
import { browser } from 'wxt/browser';
import { initializeBackgroundDebug } from '@/entrypoints/shared/debug/console-helpers';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  ensureAiModelsReady,
  refreshAiModelStatuses,
} from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import { registerAiModelStatusService } from '@/entrypoints/shared/integrations/chrome-ai/model-status-service';
import {
  recordAiPipelineBlocked,
  recordAiPipelineRouted,
} from '@/entrypoints/shared/integrations/chrome-ai/telemetry';
import { logMediaDebug } from '@/entrypoints/shared/integrations/mediainfo/debug';
import { registerInstallDateListener } from '@/entrypoints/shared/lifecycle/install-tracking';
import type {
  AiPipelineTelemetryPayload,
  EnsureAiModelsRequestPayload,
} from '@/entrypoints/shared/messaging/extension-messaging';
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
import { createCloudConsentManager } from './background/upgrade/cloud-consent-manager';
import { createUpgradeCoordinator } from './background/upgrade/coordinator';
import { createTextUpgradeAnalysisRequester } from './background/upgrade/text-analysis-request';

const readSettings = ensureSettingsCache();

const PAGE_CONTEXT_PRUNE_INTERVAL_MS = 5 * 60_000;
const DOWNLOAD_TRACKING_PRUNE_INTERVAL_MS = 15 * 60_000;
const UPGRADE_ALARM_RECONCILE_INTERVAL_MS = 15 * 60_000;

const downloadTracking = new Map<number, DownloadTrackingEntry>();

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason !== 'install') {
    return;
  }
  const setupUrl = browser.runtime.getURL('/downloads-permission.html');
  void browser.tabs.create({ url: setupUrl }).catch((error) => {
    debugLogger.warn('[Background] Failed to open setup tab after install', {
      error,
    });
  });
});

function initializeBackground(): void {
  const cloudConsentManager = createCloudConsentManager();
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

  const upgradeCoordinator = createUpgradeCoordinator({
    confirmToastController,
    readSettings,
    requestAnalysis: createTextUpgradeAnalysisRequester({
      requestCloudConsent: (context) =>
        cloudConsentManager.requestConsent(context),
      applyCloudAlways: async () => {
        const current = readSettings();
        if (
          current.cloud.textFallbackMode === 'always' &&
          current.cloud.enabled
        ) {
          return;
        }
        await updateSettings({
          cloud: {
            ...current.cloud,
            enabled: true,
            textFallbackMode: 'always',
          },
        });
      },
    }),
  });

  void upgradeCoordinator.cleanupOrphanedAlarms();

  registerInstallDateListener();
  initializeBackgroundDebug();
  void refreshAiModelStatuses().catch((error) => {
    debugLogger.warn('[AIModels] Initial availability probe failed', { error });
  });

  const pageContextService = registerPageContextService();
  registerAiModelStatusService();

  if (import.meta.env.DEV) {
    // Development mode override
    void (async () => {
      await updateSettings({
        mode: 'balanced',
        debug: {
          enabled: true,
          level: 'verbose' as const,
        },
        confirmToast: {
          autoApplyDelaySeconds: 10,
          showReasonTags: true,
          renameNotifications: {
            instantBaseline: false,
            contextualUpgrade: true,
          },
          renameToastDurationSeconds: 5,
        },
      });
      console.info(
        '[NewName] Dev override: mode set to balanced with verbose debug',
      );
    })();
  }

  onExtensionMessage('resolveRuntimeContext', ({ sender }) => ({
    tabId: sender.tab?.id ?? undefined,
    frameId: sender.frameId,
    url: sender.url ?? sender.tab?.url ?? null,
  }));

  onExtensionMessage('requestCloudConsentDetails', async ({ data }) => {
    return cloudConsentManager.getDetails(data.token);
  });

  onExtensionMessage('submitCloudConsentDecision', async ({ data }) => {
    await cloudConsentManager.submitDecision(data.token, data.decision);
    return { ok: true };
  });

  onExtensionMessage('ensureAiModelsReady', async ({ data }) => {
    const payload = data as EnsureAiModelsRequestPayload;
    const ids = payload.ids;
    debugLogger.log('[AIModels] ensureAiModelsReady request', { ids });
    const statuses = await ensureAiModelsReady({ ids });
    return statuses;
  });

  onExtensionMessage('recordAiPipelineTelemetry', ({ data }) => {
    const payload = data as AiPipelineTelemetryPayload;
    if (payload.type === 'blocked') {
      recordAiPipelineBlocked(payload.mode, payload.reason);
    } else if (payload.type === 'routed') {
      recordAiPipelineRouted(payload.source);
    }
    return { ok: true };
  });

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

    void upgradeCoordinator.handleDownloadChange(delta, info).catch((error) => {
      debugLogger.error('[UpgradeCoordinator] Unhandled failure', {
        downloadId: delta.id,
        error,
      });
    });

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
          debugLogger.error('[Background] Failed to log download bytes', {
            error,
            downloadId: delta.id,
          });
        });
    }
  });

  browser.downloads.onDeterminingFilename.addListener(
    createDeterminingListener(
      pageContextService,
      readSettings,
      downloadTracking,
      confirmToastController,
      upgradeCoordinator.scheduleMockAnalysis,
    ),
  );

  setInterval(() => {
    pruneDownloadTrackingMap(downloadTracking);
  }, DOWNLOAD_TRACKING_PRUNE_INTERVAL_MS);

  setInterval(() => {
    void pageContextService.prune();
  }, PAGE_CONTEXT_PRUNE_INTERVAL_MS);

  setInterval(() => {
    void upgradeCoordinator.cleanupOrphanedAlarms();
  }, UPGRADE_ALARM_RECONCILE_INTERVAL_MS);

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

  browser.alarms.onAlarm.addListener(async (alarm) => {
    const handled = await upgradeCoordinator.handleAlarm(alarm);
    if (handled) {
      return;
    }
    debugLogger.log('[UpgradeCoordinator] Alarm ignored by coordinator', {
      alarmName: alarm.name,
    });
  });
}

export default defineBackground(() => {
  initializeBackground();
});
