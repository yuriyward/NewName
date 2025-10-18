/**
 * Confirm toast controller manages pending confirmation requests and routing.
 */
import type { SendMessageOptions } from '@webext-core/messaging';
import type {
  SensitiveDetectionMatch,
  SensitiveReason,
} from '@/entrypoints/shared/classification/sensitive-content';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  sendConfirmToastTimingUpdate,
  sendShowConfirmToast,
} from '@/entrypoints/shared/messaging/extension-messaging';
import type { ConfirmToastTriggerSource } from '@/entrypoints/shared/settings/confirm-toast-routing';
import type { FileType, Mode } from '@/entrypoints/shared/settings/types';
import type {
  ConfirmToastDecisionMessage,
  ConfirmToastProposal,
  ConfirmToastStatusState,
  ConfirmToastTimingUpdateMessage,
  ShowConfirmToastMessage,
} from '@/entrypoints/shared/toast/types';
import { randomId } from '@/entrypoints/shared/utils/id';
import { emitStatus } from './status-broadcaster';
import { extractTabId, resolveTarget } from './target-resolver';

export interface ConfirmToastEntry {
  proposal: ConfirmToastProposal;
  historyId: string;
  target?: number | SendMessageOptions;
  timeoutId?: ReturnType<typeof setTimeout>;
  visibleOnTabs?: Set<number>;
  autoApplyRemainingMs: number | null;
}

export interface QueueConfirmToastOptions {
  historyId: string;
  downloadId?: string;
  originalFilename: string;
  proposedFilename: string;
  proposedPath: string;
  displayProposedPath: string;
  fileType: FileType;
  mode: Mode;
  reasonTags: string[];
  sensitiveReasons: SensitiveReason[];
  sensitiveMatches: SensitiveDetectionMatch[];
  triggerSources: ConfirmToastTriggerSource[];
  autoApplyDelaySeconds: number | null;
  allowAlwaysApply: boolean;
  target?: number | SendMessageOptions;
}

export interface ConfirmToastControllerHelpers {
  emitStatus(state: ConfirmToastStatusState, message?: string): Promise<void>;
}

export interface ConfirmToastControllerHooks {
  onUserDecision(
    entry: ConfirmToastEntry,
    decision: ConfirmToastDecisionMessage,
    helpers: ConfirmToastControllerHelpers,
  ): Promise<void>;
  onAutoApply(
    entry: ConfirmToastEntry,
    helpers: ConfirmToastControllerHelpers,
  ): Promise<void>;
}

export interface ConfirmToastController {
  queueConfirmation(
    options: QueueConfirmToastOptions,
  ): Promise<ConfirmToastEntry | null>;
  handleUserDecision(decision: ConfirmToastDecisionMessage): Promise<boolean>;
  cancel(
    toastId: string,
    state?: ConfirmToastStatusState,
    message?: string,
  ): Promise<boolean>;
  getPendingByHistory(historyId: string): ConfirmToastEntry | undefined;
  getAllPending(): ConfirmToastEntry[];
  emitStatus(
    entry: ConfirmToastEntry,
    state: ConfirmToastStatusState,
    message?: string,
  ): Promise<void>;
  setAutoApplyPaused(toastId: string, paused: boolean): Promise<boolean>;
}

export function createConfirmToastController(
  hooks: ConfirmToastControllerHooks,
): ConfirmToastController {
  const entriesById = new Map<string, ConfirmToastEntry>();
  const historyIndex = new Map<string, string>();
  const queuedToasts: string[] = [];
  let activeToastId: string | null = null;

  function makeHelpers(
    entry: ConfirmToastEntry,
  ): ConfirmToastControllerHelpers {
    return {
      emitStatus: (state, message) => emitStatus(entry, state, message),
    };
  }

  async function broadcastTimingUpdate(
    entry: ConfirmToastEntry,
  ): Promise<void> {
    const update: ConfirmToastTimingUpdateMessage = {
      toastId: entry.proposal.toastId,
      autoApplyAt: entry.proposal.autoApplyAt,
      autoApplyRemainingMs:
        entry.proposal.autoApplyRemainingMs ??
        entry.autoApplyRemainingMs ??
        null,
    };

    const targets: Array<number | SendMessageOptions> = [];
    if (entry.visibleOnTabs && entry.visibleOnTabs.size > 0) {
      for (const tabId of entry.visibleOnTabs) {
        targets.push(tabId);
      }
    } else if (entry.target !== undefined) {
      targets.push(entry.target);
    }

    for (const target of targets) {
      try {
        await sendConfirmToastTimingUpdate(update, target);
      } catch (error) {
        debugLogger.log(
          '[ConfirmToast] Failed to dispatch timing update to content script',
          {
            toastId: entry.proposal.toastId,
            target,
            error,
          },
        );
        if (typeof target === 'number') {
          entry.visibleOnTabs?.delete(target);
        }
      }
    }
  }

  function clearTimeoutFor(entry: ConfirmToastEntry): void {
    if (entry.timeoutId !== undefined) {
      clearTimeout(entry.timeoutId);
      entry.timeoutId = undefined;
    }
  }

  function removeEntry(toastId: string): ConfirmToastEntry | undefined {
    const entry = entriesById.get(toastId);
    if (!entry) return undefined;
    clearTimeoutFor(entry);
    entriesById.delete(toastId);
    historyIndex.delete(entry.historyId);

    // Clear active state if this was the active toast
    if (activeToastId === toastId) {
      activeToastId = null;
      // Process next queued toast
      void processNextQueuedToast();
    }

    return entry;
  }

  async function processNextQueuedToast(): Promise<void> {
    if (activeToastId !== null) {
      // Another toast is already visible
      return;
    }

    const nextToastId = queuedToasts.shift();
    if (!nextToastId) {
      // No more queued toasts
      return;
    }

    const entry = entriesById.get(nextToastId);
    if (!entry) {
      // Entry was cancelled before being shown
      void processNextQueuedToast();
      return;
    }

    // If target is undefined, this toast is waiting for a tab to become available
    // Keep it in pending but don't mark as active (will be handled by tab broadcaster)
    if (entry.target === undefined) {
      debugLogger.log('[ConfirmToast] Toast waiting for eligible tab', {
        toastId: nextToastId,
        remainingInQueue: queuedToasts.length,
      });
      return;
    }

    activeToastId = nextToastId;

    try {
      await scheduleShowToast(entry.target, { proposal: entry.proposal });
      debugLogger.log('[ConfirmToast] Queued toast now visible', {
        toastId: nextToastId,
        queueLength: queuedToasts.length,
      });
    } catch (_error) {
      // Failed to show, try next
      activeToastId = null;
      removeEntry(nextToastId);
      void processNextQueuedToast();
    }
  }

  async function scheduleShowToast(
    target: number | SendMessageOptions | undefined,
    payload: ShowConfirmToastMessage,
  ): Promise<void> {
    // Should never be called with undefined target due to checks in queueConfirmation
    if (!target) {
      const message = `[ConfirmToast] Invalid target for toast ${payload.proposal.toastId}`;
      debugLogger.error(message);
      throw new Error(message);
    }

    try {
      await sendShowConfirmToast(payload, target);
    } catch (error) {
      // This is expected to fail for restricted tabs (chrome://, about:, etc.)
      // where content scripts cannot be injected.
      debugLogger.log(
        '[ConfirmToast] Failed to dispatch toast to content script (may be restricted URL)',
        {
          toastId: payload.proposal.toastId,
          error,
        },
      );
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  async function handleAutoApply(toastId: string): Promise<void> {
    const entry = removeEntry(toastId);
    if (!entry) return;
    await hooks.onAutoApply(entry, makeHelpers(entry));
  }

  return {
    async queueConfirmation(
      options: QueueConfirmToastOptions,
    ): Promise<ConfirmToastEntry | null> {
      const createdAt = Date.now();
      const toastId = randomId();
      const autoApplyDelaySeconds = options.autoApplyDelaySeconds;
      const allowAutoApply =
        typeof autoApplyDelaySeconds === 'number' &&
        Number.isFinite(autoApplyDelaySeconds);
      const autoApplyDelayMs = allowAutoApply
        ? Math.max(0, Math.round(autoApplyDelaySeconds * 1000))
        : null;
      const autoApplyAt =
        allowAutoApply && autoApplyDelayMs !== null
          ? createdAt + autoApplyDelayMs
          : null;

      const proposal: ConfirmToastProposal = {
        toastId,
        createdAt,
        historyId: options.historyId,
        downloadId: options.downloadId,
        originalFilename: options.originalFilename,
        proposedFilename: options.proposedFilename,
        proposedPath: options.proposedPath,
        displayProposedPath: options.displayProposedPath,
        fileType: options.fileType,
        mode: options.mode,
        reasonTags: options.reasonTags,
        sensitiveReasons: options.sensitiveReasons,
        sensitiveMatches: options.sensitiveMatches,
        triggerSources: options.triggerSources,
        autoApplyAt,
        autoApplyDelaySeconds: allowAutoApply
          ? (autoApplyDelaySeconds ?? null)
          : null,
        allowAutoApply: allowAutoApply && autoApplyDelayMs !== null,
        allowAlwaysApply: options.allowAlwaysApply,
        autoApplyRemainingMs:
          allowAutoApply && autoApplyDelayMs !== null ? autoApplyDelayMs : null,
      };

      const target = await resolveTarget(options.target);
      const tabId = extractTabId(target);

      const entry: ConfirmToastEntry = {
        proposal,
        historyId: options.historyId,
        target,
        visibleOnTabs: tabId ? new Set([tabId]) : new Set(),
        autoApplyRemainingMs:
          allowAutoApply && autoApplyDelayMs !== null ? autoApplyDelayMs : null,
      };

      if (allowAutoApply && autoApplyDelayMs !== null && autoApplyDelayMs > 0) {
        entry.timeoutId = setTimeout(() => {
          void handleAutoApply(toastId);
        }, autoApplyDelayMs);
      }

      entriesById.set(toastId, entry);
      historyIndex.set(options.historyId, toastId);

      // If no eligible tab found, queue for later when a tab becomes available
      if (target === undefined) {
        queuedToasts.push(toastId);
        debugLogger.log(
          '[ConfirmToast] Toast queued (no eligible tab currently)',
          {
            toastId,
            historyId: options.historyId,
            queueLength: queuedToasts.length,
          },
        );
        return entry;
      }

      // Check if we need to queue this toast
      if (activeToastId !== null) {
        queuedToasts.push(toastId);
        debugLogger.log('[ConfirmToast] Toast queued behind active toast', {
          toastId,
          activeToastId,
          queueLength: queuedToasts.length,
        });
        return entry;
      }

      // Show immediately if no toast is active
      activeToastId = toastId;
      try {
        await scheduleShowToast(target, { proposal });
      } catch (error) {
        // Failed to show, try next queued toast
        debugLogger.warn('[ConfirmToast] Failed to show toast immediately', {
          toastId,
          error,
        });
        activeToastId = null;
        removeEntry(toastId);
        void processNextQueuedToast();
      }
      return entry;
    },

    async handleUserDecision(
      decision: ConfirmToastDecisionMessage,
    ): Promise<boolean> {
      const entry = removeEntry(decision.toastId);
      if (!entry) {
        debugLogger.warn(
          '[ConfirmToast] Decision received for unknown toast',
          decision.toastId,
        );
        return false;
      }

      await hooks.onUserDecision(entry, decision, makeHelpers(entry));
      return true;
    },

    async cancel(
      toastId: string,
      state?: ConfirmToastStatusState,
      message?: string,
    ): Promise<boolean> {
      const entry = removeEntry(toastId);
      if (!entry) return false;
      if (state) {
        await emitStatus(entry, state, message);
      }
      return true;
    },

    getPendingByHistory(historyId: string): ConfirmToastEntry | undefined {
      const toastId = historyIndex.get(historyId);
      if (!toastId) return undefined;
      return entriesById.get(toastId);
    },

    getAllPending(): ConfirmToastEntry[] {
      return Array.from(entriesById.values());
    },

    async setAutoApplyPaused(
      toastId: string,
      paused: boolean,
    ): Promise<boolean> {
      const entry = entriesById.get(toastId);
      if (!entry) return false;
      if (!entry.proposal.allowAutoApply) return false;

      if (paused) {
        if (entry.proposal.autoApplyAt === null) {
          return true;
        }
        const remaining = Math.max(0, entry.proposal.autoApplyAt - Date.now());
        entry.autoApplyRemainingMs = remaining;
        entry.proposal.autoApplyRemainingMs = remaining;
        entry.proposal.autoApplyAt = null;
        clearTimeoutFor(entry);
        await broadcastTimingUpdate(entry);
        return true;
      }

      if (entry.proposal.autoApplyAt !== null) {
        return true;
      }

      const remainingSource =
        entry.autoApplyRemainingMs ?? entry.proposal.autoApplyRemainingMs ?? 0;
      const remaining = Math.max(0, Math.round(remainingSource));

      if (remaining <= 0) {
        clearTimeoutFor(entry);
        entry.autoApplyRemainingMs = 0;
        entry.proposal.autoApplyRemainingMs = 0;
        void handleAutoApply(toastId);
        return true;
      }

      entry.autoApplyRemainingMs = remaining;
      entry.proposal.autoApplyRemainingMs = remaining;
      entry.proposal.autoApplyAt = Date.now() + remaining;
      clearTimeoutFor(entry);
      entry.timeoutId = setTimeout(() => {
        void handleAutoApply(toastId);
      }, remaining);
      await broadcastTimingUpdate(entry);
      return true;
    },

    emitStatus,
  };
}
