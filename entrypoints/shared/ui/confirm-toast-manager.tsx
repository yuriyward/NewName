/**
 * Toast manager rendered inside the content script via Shadow DOM.
 */
import ReactDOM from 'react-dom/client';
import { sendConfirmToastDecision } from '@/entrypoints/shared/messaging/extension-messaging';
import {
  getSettings,
  subscribeSettings,
} from '@/entrypoints/shared/settings/settings';
import type {
  ConfirmToastAction,
  ConfirmToastDecisionMessage,
  ConfirmToastProposal,
  ConfirmToastRenderState,
  ConfirmToastStatusMessage,
  RenameToastPayload,
} from '@/entrypoints/shared/toast/types';
import { createKeyboardHandler } from './toast/keyboard-handler';
import type { RenameToastState } from './toast/rename-toast';
import { createContainer, TOAST_ROOT_ID } from './toast/toast-container';
import { createToastLifecycleManager } from './toast/toast-lifecycle';
import { ToastOverlay } from './toast/toast-overlay';

// Confirm toasts should disappear as soon as we receive a final status.
const CONFIRM_RESOLVE_REMOVAL_MS = 0;
// Rename overlay should remain briefly so Balanced/Silent flows get feedback.
const RENAME_TOAST_DURATION_MS = 3000;

type ToastMap = Map<string, ConfirmToastRenderState>;
type RenameToastMap = Map<string, RenameToastState>;

function sortToastsDescending(toasts: ToastMap): ConfirmToastRenderState[] {
  return Array.from(toasts.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export class ConfirmToastManager {
  private toasts: ToastMap = new Map();
  private renameToasts: RenameToastMap = new Map();
  private lifecycle = createToastLifecycleManager();
  private keyboard = createKeyboardHandler(this.toasts, (toast) =>
    this.sendAction(toast, 'keep-original'),
  );
  private root: ReactDOM.Root;
  private host: HTMLDivElement;
  private mount: HTMLDivElement;
  private currentTheme: 'light' | 'dark' = 'dark';

  constructor() {
    const existing = document.getElementById(TOAST_ROOT_ID);
    if (existing) {
      existing.remove();
    }
    const { host, mount } = createContainer();
    this.host = host;
    this.mount = mount;
    this.root = ReactDOM.createRoot(mount);

    // Initialize theme from settings
    getSettings()
      .then((settings) => {
        this.currentTheme = settings.theme;
        this.applyTheme(settings.theme);
        this.render();
      })
      .catch(() => {
        this.render();
      });

    // Subscribe to theme changes
    subscribeSettings((settings) => {
      if (settings.theme !== this.currentTheme) {
        this.currentTheme = settings.theme;
        this.applyTheme(settings.theme);
      }
    });
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    // Apply to host for :host(.dark) selectors
    this.host.className = theme;
    // Apply to mount for HeroUI components
    this.mount.className = theme;
  }

  showToast(proposal: ConfirmToastProposal): void {
    this.lifecycle.clearRemovalTimer(proposal.toastId);
    this.toasts.set(proposal.toastId, {
      ...proposal,
      status: 'pending',
      statusMessage: undefined,
      resolving: false,
    });
    this.render();
  }

  updateStatus(message: ConfirmToastStatusMessage): void {
    const toast = this.toasts.get(message.toastId);
    if (!toast) {
      console.warn(
        '[ConfirmToast] Received status for unknown toast',
        message.toastId,
      );
      return;
    }
    toast.status = message.state;
    toast.statusMessage = message.message;
    toast.resolving = false;
    if (message.state !== 'error') {
      this.lifecycle.scheduleRemoval(
        message.toastId,
        CONFIRM_RESOLVE_REMOVAL_MS,
        () => {
          this.toasts.delete(message.toastId);
          this.render();
          this.keyboard.ensureKeyListener();
        },
      );
    }
    this.render();
  }

  showRenameResult(toast: RenameToastPayload): void {
    this.lifecycle.clearRemovalTimer(toast.toastId);
    const duration = RENAME_TOAST_DURATION_MS;
    const now = Date.now();
    this.renameToasts.set(toast.toastId, {
      ...toast,
      durationMs: duration,
      remainingMs: duration,
      dismissAt: now + duration,
      paused: false,
    });
    this.lifecycle.scheduleRemoval(toast.toastId, duration, () => {
      this.renameToasts.delete(toast.toastId);
      this.render();
      this.keyboard.ensureKeyListener();
      if (this.renameToasts.size === 0) {
        this.lifecycle.stopRenameTicker();
      }
    });
    this.lifecycle.startRenameTicker(this.renameToasts, () => this.render());
    this.render();
  }

  destroy(): void {
    this.root.unmount();
    this.host.remove();
    this.keyboard.removeKeyListener();
    this.lifecycle.destroy();
  }

  private render(): void {
    const ordered = sortToastsDescending(this.toasts);
    const rename = Array.from(this.renameToasts.values()).sort(
      (a, b) => b.createdAt - a.createdAt,
    );
    this.root.render(
      <ToastOverlay
        confirmToasts={ordered}
        renameToasts={rename}
        onApprove={(toast, edited) => {
          void this.sendAction(toast, 'approve', edited);
        }}
        onKeep={(toast) => {
          void this.sendAction(toast, 'keep-original');
        }}
        onAlwaysApply={(toast, edited) => {
          if (!toast.allowAlwaysApply) {
            void this.sendAction(toast, 'approve', edited);
            return;
          }
          void this.sendAction(toast, 'always-apply', edited);
        }}
        onRenameHoverStart={(id) => {
          this.pauseRenameToast(id);
        }}
        onRenameHoverEnd={(id) => {
          this.resumeRenameToast(id);
        }}
        onRenameUndo={(id) => {
          this.handleRenameUndo(id);
        }}
      />,
    );
    this.keyboard.ensureKeyListener();
  }

  private handleRenameUndo(toastId: string): void {
    const toast = this.renameToasts.get(toastId);
    if (!toast) return;
    // TODO: Implement undo logic - need to send message to background
    // For now, just dismiss the toast
    this.renameToasts.delete(toastId);
    this.lifecycle.clearRemovalTimer(toastId);
    this.render();
    if (this.renameToasts.size === 0) {
      this.lifecycle.stopRenameTicker();
    }
  }

  private async sendAction(
    toast: ConfirmToastRenderState,
    action: ConfirmToastAction,
    edited?: string,
  ): Promise<void> {
    if (toast.resolving) return;
    toast.resolving = true;
    toast.status = 'pending';
    toast.statusMessage = undefined;
    this.render();

    const payload: ConfirmToastDecisionMessage = {
      toastId: toast.toastId,
      historyId: toast.historyId,
      downloadId: toast.downloadId,
      action,
    };

    const trimmedName = edited?.trim();
    if (
      trimmedName &&
      trimmedName.length > 0 &&
      trimmedName !== toast.proposedFilename
    ) {
      payload.editedFilename = trimmedName;
    }

    try {
      await sendConfirmToastDecision(payload);
    } catch (error) {
      toast.resolving = false;
      toast.status = 'error';
      toast.statusMessage =
        error instanceof Error
          ? error.message
          : 'Failed to send decision. Please try again.';
      this.render();
    }
  }

  private pauseRenameToast(toastId: string): void {
    const updated = this.lifecycle.pauseRenameToast(toastId, this.renameToasts);
    if (updated) {
      this.render();
    }
  }

  private resumeRenameToast(toastId: string): void {
    const result = this.lifecycle.resumeRenameToast(toastId, this.renameToasts);
    if (result) {
      this.lifecycle.scheduleRemoval(toastId, result.remaining, () => {
        this.renameToasts.delete(toastId);
        this.render();
        this.keyboard.ensureKeyListener();
        if (this.renameToasts.size === 0) {
          this.lifecycle.stopRenameTicker();
        }
      });
      this.lifecycle.startRenameTicker(this.renameToasts, () => this.render());
      this.render();
    }
  }
}

let singleton: ConfirmToastManager | null = null;

export function getConfirmToastManager(): ConfirmToastManager {
  if (!singleton) {
    singleton = new ConfirmToastManager();
  }
  return singleton;
}

export function resetConfirmToastManagerForTesting(): void {
  singleton?.destroy();
  singleton = null;
}
