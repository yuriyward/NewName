/**
 * Toast manager rendered inside the content script via Shadow DOM.
 */
import ReactDOM from 'react-dom/client';
import { TOAST_TIMING } from '@/entrypoints/shared/toast/timing-constants';
import type {
  ConfirmToastProposal,
  ConfirmToastStatusMessage,
  ConfirmToastTimingUpdateMessage,
  RenameToastProposal,
} from '@/entrypoints/shared/toast/types';
import { createKeyboardHandler } from './toast/keyboard-handler';
import { createToastActionHandler } from './toast/toast-action-handler';
import { createContainer, TOAST_ROOT_ID } from './toast/toast-container';
import { createToastLifecycleManager } from './toast/toast-lifecycle';
import { ToastOverlay } from './toast/toast-overlay';
import { createToastStateManager } from './toast/toast-state-manager';
import { createThemeManager } from './toast/toast-theme-manager';

export class ConfirmToastManager {
  private state = createToastStateManager();
  private lifecycle = createToastLifecycleManager();
  private actions = createToastActionHandler({
    onRenderNeeded: () => this.render(),
  });
  private keyboard = createKeyboardHandler(this.state.confirmToasts, (toast) =>
    this.actions.sendAction(toast, 'keep-original'),
  );
  private themeManager: ReturnType<typeof createThemeManager>;
  private root: ReactDOM.Root;
  private host: HTMLDivElement;

  constructor() {
    const existing = document.getElementById(TOAST_ROOT_ID);
    if (existing) {
      existing.remove();
    }
    const { host, mount } = createContainer();
    this.host = host;
    this.root = ReactDOM.createRoot(mount);

    // Initialize theme management
    this.themeManager = createThemeManager({ host, mount }, () =>
      this.render(),
    );
  }

  showToast(proposal: ConfirmToastProposal): void {
    this.lifecycle.clearRemovalTimer(proposal.toastId);
    this.state.addConfirmToast(proposal);
    this.render();
  }

  updateStatus(message: ConfirmToastStatusMessage): void {
    const toast = this.state.updateConfirmToastStatus(message);
    if (!toast) return;

    this.lifecycle.scheduleRemoval(
      message.toastId,
      TOAST_TIMING.CONFIRM_REMOVAL_DELAY_MS,
      () => {
        this.state.removeConfirmToast(message.toastId);
        this.render();
        this.keyboard.ensureKeyListener();
      },
    );
    this.render();
  }

  updateTiming(update: ConfirmToastTimingUpdateMessage): void {
    const toast = this.state.updateConfirmToastTiming(update);
    if (!toast) return;
    this.render();
  }

  showRenameResult(toast: RenameToastProposal): void {
    this.lifecycle.clearRemovalTimer(toast.toastId);
    const duration =
      typeof toast.durationMs === 'number' && toast.durationMs > 0
        ? toast.durationMs
        : TOAST_TIMING.RENAME_DISPLAY_DURATION_MS;
    const normalizedToast = { ...toast, durationMs: duration };
    this.state.addRenameToast(normalizedToast);
    this.lifecycle.scheduleRemoval(toast.toastId, duration, () => {
      this.state.removeRenameToast(toast.toastId);
      this.render();
      this.keyboard.ensureKeyListener();
      if (!this.state.hasRenameToasts()) {
        this.lifecycle.stopRenameTicker();
      }
    });
    this.lifecycle.startRenameTicker(this.state.renameToasts, () =>
      this.render(),
    );
    this.render();
  }

  destroy(): void {
    this.root.unmount();
    this.host.remove();
    this.keyboard.removeKeyListener();
    this.lifecycle.destroy();
    this.themeManager.destroy();
  }

  private render(): void {
    this.root.render(
      <ToastOverlay
        confirmToasts={this.state.getConfirmToasts()}
        renameToasts={this.state.getRenameToasts()}
        onApprove={(toast, edited) => {
          void this.actions.sendAction(toast, 'approve', edited);
        }}
        onKeep={(toast) => {
          void this.actions.sendAction(toast, 'keep-original');
        }}
        onRenameHoverStart={(id) => {
          this.pauseRenameToast(id);
        }}
        onRenameHoverEnd={(id) => {
          this.resumeRenameToast(id);
        }}
      />,
    );
    this.keyboard.ensureKeyListener();
  }

  private pauseRenameToast(toastId: string): void {
    const updated = this.lifecycle.pauseRenameToast(
      toastId,
      this.state.renameToasts,
    );
    if (updated) {
      this.render();
    }
  }

  private resumeRenameToast(toastId: string): void {
    const result = this.lifecycle.resumeRenameToast(
      toastId,
      this.state.renameToasts,
    );
    if (result) {
      this.lifecycle.scheduleRemoval(toastId, result.remaining, () => {
        this.state.removeRenameToast(toastId);
        this.render();
        this.keyboard.ensureKeyListener();
        if (!this.state.hasRenameToasts()) {
          this.lifecycle.stopRenameTicker();
        }
      });
      this.lifecycle.startRenameTicker(this.state.renameToasts, () =>
        this.render(),
      );
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
