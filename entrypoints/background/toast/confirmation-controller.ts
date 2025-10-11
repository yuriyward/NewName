/**
 * Confirm toast controller manages pending confirmation requests and routing.
 */
import type { SendMessageOptions } from '@webext-core/messaging';
import type {
  SensitiveDetectionMatch,
  SensitiveReason,
} from '@/entrypoints/shared/classification/sensitive-content';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { sendShowConfirmToast } from '@/entrypoints/shared/messaging/extension-messaging';
import type { ConfirmToastTriggerSource } from '@/entrypoints/shared/settings/confirm-toast-routing';
import type { FileType, Mode } from '@/entrypoints/shared/settings/types';
import type {
  ConfirmToastDecisionMessage,
  ConfirmToastProposal,
  ConfirmToastStatusState,
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
}

export function createConfirmToastController(
  hooks: ConfirmToastControllerHooks,
): ConfirmToastController {
  const entriesById = new Map<string, ConfirmToastEntry>();
  const historyIndex = new Map<string, string>();

  function makeHelpers(
    entry: ConfirmToastEntry,
  ): ConfirmToastControllerHelpers {
    return {
      emitStatus: (state, message) => emitStatus(entry, state, message),
    };
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
    return entry;
  }

  async function scheduleShowToast(
    target: number | SendMessageOptions | undefined,
    payload: ShowConfirmToastMessage,
  ): Promise<void> {
    if (target === undefined) {
      throw new Error(
        `[ConfirmToast] Missing tab target for toast ${payload.proposal.toastId}`,
      );
    }
    try {
      await sendShowConfirmToast(payload, target);
    } catch (error) {
      console.error(
        '[ConfirmToast] Failed to dispatch toast to content script',
        payload.proposal.toastId,
        error,
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
      };

      const target = await resolveTarget();
      const tabId = extractTabId(target);

      const entry: ConfirmToastEntry = {
        proposal,
        historyId: options.historyId,
        target,
        visibleOnTabs: tabId ? new Set([tabId]) : new Set(),
      };

      if (allowAutoApply && autoApplyDelayMs !== null && autoApplyDelayMs > 0) {
        entry.timeoutId = setTimeout(() => {
          void handleAutoApply(toastId);
        }, autoApplyDelayMs);
      }

      entriesById.set(toastId, entry);
      historyIndex.set(options.historyId, toastId);

      await scheduleShowToast(target, { proposal });
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

    emitStatus,
  };
}
