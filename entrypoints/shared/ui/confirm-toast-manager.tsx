/**
 * Toast manager rendered inside the content script via Shadow DOM.
 */
import { HeroUIProvider } from '@heroui/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import shadowDomStyles from '@/assets/shadow-dom.css?inline';
import { sendConfirmToastDecision } from '@/entrypoints/shared/messaging/extension-messaging';
import {
  getSettings,
  subscribeSettings,
} from '@/entrypoints/shared/settings/settings';
import { ConfirmToast } from '@/entrypoints/shared/ui/ConfirmToast';
import type {
  ConfirmToastAction,
  ConfirmToastDecisionMessage,
  ConfirmToastProposal,
  ConfirmToastRenderState,
  ConfirmToastStatusMessage,
  RenameToastPayload,
} from '@/entrypoints/shared/ui/confirm-toast-types';
import { FilenameLabel } from '@/entrypoints/shared/ui/FilenameLabel';

const TOAST_ROOT_ID = 'newname-confirm-toast-root';
// Confirm toasts should disappear as soon as we receive a final status.
const CONFIRM_RESOLVE_REMOVAL_MS = 0;
// Rename overlay should remain briefly so Balanced/Silent flows get feedback.
const RENAME_TOAST_DURATION_MS = 3000;

type ToastMap = Map<string, ConfirmToastRenderState>;
interface RenameToastState extends RenameToastPayload {
  durationMs: number;
  remainingMs: number;
  dismissAt: number | null;
  paused: boolean;
}

type RenameToastMap = Map<string, RenameToastState>;
type RenameRemovalCallback = () => void;

function createStyleElement(): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = shadowDomStyles;
  return style;
}

function createContainer(): {
  host: HTMLDivElement;
  shadow: ShadowRoot;
  mount: HTMLDivElement;
} {
  const host = document.createElement('div');
  host.id = TOAST_ROOT_ID;
  host.setAttribute('data-newname', 'confirm-toast');
  // Specific resets instead of nuclear 'all: initial' to allow CSS inheritance
  host.style.position = 'fixed';
  host.style.zIndex = '2147483647';
  host.style.pointerEvents = 'none';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });
  const mount = document.createElement('div');
  shadow.appendChild(createStyleElement());
  shadow.appendChild(mount);
  return { host, shadow, mount };
}

function sortToastsDescending(toasts: ToastMap): ConfirmToastRenderState[] {
  return Array.from(toasts.values()).sort((a, b) => b.createdAt - a.createdAt);
}

interface RenameToastState extends RenameToastPayload {}

interface ToastOverlayProps {
  confirmToasts: ConfirmToastRenderState[];
  renameToasts: RenameToastState[];
  onApprove: (toast: ConfirmToastRenderState, edited?: string) => void;
  onKeep: (toast: ConfirmToastRenderState) => void;
  onAlwaysApply: (toast: ConfirmToastRenderState, edited?: string) => void;
  onRenameHoverStart: (toastId: string) => void;
  onRenameHoverEnd: (toastId: string) => void;
  onRenameUndo: (toastId: string) => void;
}

const RenameToast: React.FC<{
  toast: RenameToastState;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onUndo: () => void;
}> = ({ toast, onHoverStart, onHoverEnd, onUndo }) => {
  const total = toast.durationMs;
  const remaining = Math.max(0, toast.remainingMs);
  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  const progress = total > 0 ? Math.min(1, (total - remaining) / total) : 1;

  return (
    // biome-ignore lint/a11y/useSemanticElements: Interactive hover handlers require div element
    <div
      role="status"
      className="pointer-events-auto w-full rounded-lg border border-divider bg-content1 px-3 py-2 shadow-2xl backdrop-blur"
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-primary">✓</span>
          <p className="text-sm font-semibold text-foreground">
            Rename applied
          </p>
        </div>
        <button
          type="button"
          onClick={onUndo}
          className="cursor-pointer text-[10px] font-medium text-primary transition-opacity hover:opacity-70"
        >
          Undo
        </button>
      </div>
      <div className="mt-0.5">
        <FilenameLabel
          originalFilename={toast.originalFilename}
          newFilename={toast.finalFilename}
          layout="inline"
        />
      </div>
      <div className="mt-2 h-1 rounded bg-default-100">
        <div
          className="h-full rounded bg-primary transition-[width] duration-200"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="mt-2 text-right text-[10px] font-medium uppercase tracking-wide text-default-400">
        {toast.paused ? 'Paused' : `Hiding in ${seconds}s`}
      </div>
    </div>
  );
};

const ToastOverlay: React.FC<ToastOverlayProps> = React.memo(
  ({
    confirmToasts,
    renameToasts,
    onApprove,
    onKeep,
    onAlwaysApply,
    onRenameHoverStart,
    onRenameHoverEnd,
    onRenameUndo,
  }) => {
    if (confirmToasts.length === 0 && renameToasts.length === 0) return null;
    return (
      <HeroUIProvider>
        <div className="pointer-events-none fixed inset-0 z-[2147483647] flex flex-col items-end justify-end gap-2 px-4 py-4">
          <div className="flex w-full max-w-xs flex-col gap-2">
            {confirmToasts.map((toast, index) => (
              <div
                key={toast.toastId}
                className="pointer-events-auto animate-in fade-in slide-in-from-right-2 duration-300"
              >
                <ConfirmToast
                  toast={toast}
                  autoFocus={index === 0}
                  onApprove={(edited) => onApprove(toast, edited)}
                  onKeep={() => onKeep(toast)}
                  onAlwaysApply={(edited) => onAlwaysApply(toast, edited)}
                />
              </div>
            ))}
            {renameToasts.map((toast) => (
              <div
                key={toast.toastId}
                className="animate-in fade-in slide-in-from-right-2 duration-300"
              >
                <RenameToast
                  toast={toast}
                  onHoverStart={() => onRenameHoverStart(toast.toastId)}
                  onHoverEnd={() => onRenameHoverEnd(toast.toastId)}
                  onUndo={() => onRenameUndo(toast.toastId)}
                />
              </div>
            ))}
          </div>
        </div>
      </HeroUIProvider>
    );
  },
);

export class ConfirmToastManager {
  private toasts: ToastMap = new Map();
  private renameToasts: RenameToastMap = new Map();
  private removalTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private root: ReactDOM.Root;
  private host: HTMLDivElement;
  private mount: HTMLDivElement;
  private keyListenerAttached = false;
  private renameTicker: ReturnType<typeof setInterval> | undefined;
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
    this.clearRemovalTimer(proposal.toastId);
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
      this.scheduleRemoval(message.toastId);
    }
    this.render();
  }

  showRenameResult(toast: RenameToastPayload): void {
    this.clearRemovalTimer(toast.toastId);
    const duration = RENAME_TOAST_DURATION_MS;
    const now = Date.now();
    this.renameToasts.set(toast.toastId, {
      ...toast,
      durationMs: duration,
      remainingMs: duration,
      dismissAt: now + duration,
      paused: false,
    });
    this.scheduleRemoval(toast.toastId, duration);
    this.startRenameTicker();
    this.render();
  }

  destroy(): void {
    this.root.unmount();
    this.host.remove();
    this.removeKeyListener();
    this.stopRenameTicker();
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
    this.ensureKeyListener();
  }

  private handleRenameUndo(toastId: string): void {
    const toast = this.renameToasts.get(toastId);
    if (!toast) return;
    // TODO: Implement undo logic - need to send message to background
    // For now, just dismiss the toast
    this.renameToasts.delete(toastId);
    this.clearRemovalTimer(toastId);
    this.render();
    if (this.renameToasts.size === 0) {
      this.stopRenameTicker();
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

  private scheduleRemoval(
    toastId: string,
    delay = CONFIRM_RESOLVE_REMOVAL_MS,
    onRemove?: RenameRemovalCallback,
  ): void {
    this.clearRemovalTimer(toastId);
    if (delay <= 0) {
      const removedConfirm = this.toasts.delete(toastId);
      const removedRename = this.renameToasts.delete(toastId);
      onRemove?.();
      if (removedConfirm || removedRename) {
        this.render();
        this.ensureKeyListener();
      }
      if (this.renameToasts.size === 0) {
        this.stopRenameTicker();
      }
      return;
    }
    const timer = setTimeout(() => {
      const removedConfirm = this.toasts.delete(toastId);
      const removedRename = this.renameToasts.delete(toastId);
      this.removalTimers.delete(toastId);
      onRemove?.();
      if (removedConfirm || removedRename) {
        this.render();
        this.ensureKeyListener();
      }
      if (this.renameToasts.size === 0) {
        this.stopRenameTicker();
      }
    }, delay);
    this.removalTimers.set(toastId, timer);
  }

  private clearRemovalTimer(toastId: string): void {
    const timer = this.removalTimers.get(toastId);
    if (timer) {
      clearTimeout(timer);
      this.removalTimers.delete(toastId);
    }
  }

  private startRenameTicker(): void {
    if (this.renameTicker) return;
    this.renameTicker = setInterval(() => {
      if (this.renameToasts.size === 0) {
        this.stopRenameTicker();
        return;
      }
      const now = Date.now();
      let updated = false;
      for (const toast of this.renameToasts.values()) {
        if (toast.paused || toast.dismissAt === null) continue;
        const nextRemaining = Math.max(0, toast.dismissAt - now);
        if (Math.abs(nextRemaining - toast.remainingMs) > 120) {
          toast.remainingMs = nextRemaining;
          updated = true;
        }
      }
      if (updated) {
        this.render();
      }
    }, 150);
  }

  private stopRenameTicker(): void {
    if (!this.renameTicker) return;
    clearInterval(this.renameTicker);
    this.renameTicker = undefined;
  }

  private pauseRenameToast(toastId: string): void {
    const toast = this.renameToasts.get(toastId);
    if (!toast || toast.paused) return;
    if (toast.dismissAt !== null) {
      toast.remainingMs = Math.max(0, toast.dismissAt - Date.now());
    }
    toast.dismissAt = null;
    toast.paused = true;
    this.clearRemovalTimer(toastId);
    this.render();
  }

  private resumeRenameToast(toastId: string): void {
    const toast = this.renameToasts.get(toastId);
    if (!toast || !toast.paused) return;
    toast.paused = false;
    const remaining = Math.max(0, toast.remainingMs);
    toast.dismissAt = Date.now() + remaining;
    this.scheduleRemoval(toastId, remaining);
    this.startRenameTicker();
    this.render();
  }

  private getLatestToast(): ConfirmToastRenderState | undefined {
    if (this.toasts.size === 0) return undefined;
    const ordered = sortToastsDescending(this.toasts);
    return ordered[0];
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    const toast = this.getLatestToast();
    if (!toast) return;
    if (toast.status !== 'pending' || toast.resolving) {
      return;
    }
    event.preventDefault();
    void this.sendAction(toast, 'keep-original');
  };

  private ensureKeyListener(): void {
    if (this.toasts.size > 0 && !this.keyListenerAttached) {
      document.addEventListener('keydown', this.handleKeyDown, true);
      this.keyListenerAttached = true;
      return;
    }
    if (this.toasts.size === 0 && this.keyListenerAttached) {
      this.removeKeyListener();
    }
  }

  private removeKeyListener(): void {
    if (!this.keyListenerAttached) return;
    document.removeEventListener('keydown', this.handleKeyDown, true);
    this.keyListenerAttached = false;
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
