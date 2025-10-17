import { browser } from 'wxt/browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type {
  CloudConsentDecision,
  CloudConsentRequestDetails,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import { randomId } from '@/entrypoints/shared/utils/id';

export interface CloudConsentRequestContext {
  historyId: string;
  downloadId?: number;
  filename: string;
  baselineName: string;
  relativePath: string;
}

interface PendingConsent {
  token: string;
  detail: CloudConsentRequestDetails;
  resolve: (decision: CloudConsentDecision) => void;
  reject: (reason?: unknown) => void;
  tabId?: number;
}

export interface CloudConsentManager {
  requestConsent(
    context: CloudConsentRequestContext,
  ): Promise<CloudConsentDecision>;
  getDetails(token: string): CloudConsentRequestDetails | null;
  submitDecision(token: string, decision: CloudConsentDecision): Promise<void>;
}

export function createCloudConsentManager(): CloudConsentManager {
  const pending = new Map<string, PendingConsent>();

  browser.tabs.onRemoved.addListener((tabId) => {
    for (const [token, entry] of pending.entries()) {
      if (entry.tabId === tabId) {
        entry.reject(new Error('Cloud consent tab closed by user'));
        pending.delete(token);
      }
    }
  });

  async function openConsentTab(token: string): Promise<number | undefined> {
    try {
      const basePath = '/cloud-consent.html';
      const baseUrl = browser.runtime.getURL(
        basePath as Parameters<typeof browser.runtime.getURL>[0],
      );
      const url = `${baseUrl}?token=${token}`;
      const tab = await browser.tabs.create({
        url,
        active: true,
      });
      return tab.id ?? undefined;
    } catch (error) {
      debugLogger.error('[CloudConsent] Failed to open consent tab', { error });
      return undefined;
    }
  }

  return {
    async requestConsent(context) {
      const token = randomId();
      const detail: CloudConsentRequestDetails = {
        token,
        historyId: context.historyId,
        downloadId: context.downloadId,
        filename: context.filename,
        relativePath: context.relativePath,
        baselineName: context.baselineName,
        requestedAt: Date.now(),
      };

      let resolveFn: ((decision: CloudConsentDecision) => void) | null = null;
      let rejectFn: ((reason?: unknown) => void) | null = null;

      const promise = new Promise<CloudConsentDecision>((resolve, reject) => {
        resolveFn = resolve;
        rejectFn = reject;
      });

      const entry: PendingConsent = {
        token,
        detail,
        resolve: (decision) => resolveFn?.(decision),
        reject: (reason) => rejectFn?.(reason),
      };

      pending.set(token, entry);

      void openConsentTab(token)
        .then((tabId) => {
          if (!pending.has(token)) return;
          entry.tabId = tabId;
          if (tabId === undefined) {
            entry.reject(new Error('Failed to open consent tab'));
            pending.delete(token);
          }
        })
        .catch((error) => {
          debugLogger.error('[CloudConsent] Opening consent tab failed', {
            error,
          });
          if (pending.has(token)) {
            entry.reject(error);
            pending.delete(token);
          }
        });

      return await promise.finally(() => {
        pending.delete(token);
      });
    },

    getDetails(token) {
      const entry = pending.get(token);
      return entry?.detail ?? null;
    },

    async submitDecision(token, decision) {
      const entry = pending.get(token);
      if (!entry) {
        debugLogger.warn('[CloudConsent] No pending request for token', {
          token,
        });
        return;
      }

      try {
        entry.resolve(decision);
      } catch (error) {
        entry.reject(error);
      } finally {
        pending.delete(token);
        if (entry.tabId !== undefined) {
          try {
            await browser.tabs.remove(entry.tabId);
          } catch (error) {
            debugLogger.warn('[CloudConsent] Failed to close consent tab', {
              token,
              error,
            });
          }
        }
      }
    },
  };
}
