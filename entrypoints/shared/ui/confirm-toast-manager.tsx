/**
 * Toast manager rendered inside the content script via Shadow DOM.
 */
import ReactDOM from 'react-dom/client';
import { TOAST_TIMING } from '@/entrypoints/shared/toast/timing-constants';
import type {
  ConfirmToastProposal,
  ConfirmToastStatusMessage,
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
    createThemeManager({ host, mount }, () => this.render());
  }

  showToast(proposal: ConfirmToastProposal): void {
    this.lifecycle.clearRemovalTimer(proposal.toastId);
    this.state.addConfirmToast(proposal);
    this.render();
  }

  updateStatus(message: ConfirmToastStatusMessage): void {
    const toast = this.state.updateConfirmToastStatus(message);
    if (!toast) return;

    if (message.state !== 'error') {
      this.lifecycle.scheduleRemoval(
        message.toastId,
        TOAST_TIMING.CONFIRM_REMOVAL_DELAY_MS,
        () => {
          this.state.removeConfirmToast(message.toastId);
          this.render();
          this.keyboard.ensureKeyListener();
        },
      );
    }
    this.render();
  }

  showRenameResult(toast: RenameToastProposal): void {
    this.lifecycle.clearRemovalTimer(toast.toastId);
    this.state.addRenameToast(toast, TOAST_TIMING.RENAME_DISPLAY_DURATION_MS);
    this.lifecycle.scheduleRemoval(
      toast.toastId,
      TOAST_TIMING.RENAME_DISPLAY_DURATION_MS,
      () => {
        this.state.removeRenameToast(toast.toastId);
        this.render();
        this.keyboard.ensureKeyListener();
        if (!this.state.hasRenameToasts()) {
          this.lifecycle.stopRenameTicker();
        }
      },
    );
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
        onAlwaysApply={(toast, edited) => {
          if (!toast.allowAlwaysApply) {
            void this.actions.sendAction(toast, 'approve', edited);
            return;
          }
          void this.actions.sendAction(toast, 'always-apply', edited);
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
    const toast = this.state.getRenameToast(toastId);
    if (!toast) return;
    // TODO: Implement undo logic - need to send message to background
    // For now, just dismiss the toast
    this.state.removeRenameToast(toastId);
    this.lifecycle.clearRemovalTimer(toastId);
    this.render();
    if (!this.state.hasRenameToasts()) {
      this.lifecycle.stopRenameTicker();
    }
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
