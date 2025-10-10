/**
 * Keyboard event handler for toast interactions.
 */
import type { ConfirmToastState } from '@/entrypoints/shared/toast/types';

type ConfirmToastStateMap = Map<string, ConfirmToastState>;

/**
 * Creates a keyboard handler for toast interactions (Escape to dismiss).
 */
export function createKeyboardHandler(
  toasts: ConfirmToastStateMap,
  onKeep: (toast: ConfirmToastState) => void,
) {
  let keyListenerAttached = false;

  function getLatestToast(): ConfirmToastState | undefined {
    if (toasts.size === 0) return undefined;
    const ordered = Array.from(toasts.values()).sort(
      (a, b) => b.createdAt - a.createdAt,
    );
    return ordered[0];
  }

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    const toast = getLatestToast();
    if (!toast) return;
    if (toast.status !== 'pending' || toast.resolving) {
      return;
    }
    event.preventDefault();
    onKeep(toast);
  };

  function ensureKeyListener(): void {
    if (toasts.size > 0 && !keyListenerAttached) {
      document.addEventListener('keydown', handleKeyDown, true);
      keyListenerAttached = true;
      return;
    }
    if (toasts.size === 0 && keyListenerAttached) {
      removeKeyListener();
    }
  }

  function removeKeyListener(): void {
    if (!keyListenerAttached) return;
    document.removeEventListener('keydown', handleKeyDown, true);
    keyListenerAttached = false;
  }

  return {
    ensureKeyListener,
    removeKeyListener,
  };
}
