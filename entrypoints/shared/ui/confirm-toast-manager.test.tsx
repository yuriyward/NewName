/**
 * Tests for toast manager lifecycle and interactions
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ConfirmToastProposal,
  ConfirmToastStatusMessage,
} from '@/entrypoints/shared/toast/types';
import type { ToastOverlayProps } from './toast/toast-overlay';

// Mock inline Tailwind import used by the toast container setup.
vi.mock('@/assets/tailwind.css?inline', () => ({
  default: '',
}));

// Keep track of the latest render props so assertions can inspect toast state.
let latestOverlayProps: ToastOverlayProps | null = null;
const renderSpy = vi.fn((element: { props?: ToastOverlayProps } | null) => {
  latestOverlayProps = (element?.props ?? null) as ToastOverlayProps | null;
});
const unmountSpy = vi.fn();
vi.mock('react-dom/client', () => ({
  __esModule: true,
  default: {
    createRoot: () => ({
      render: renderSpy,
      unmount: unmountSpy,
    }),
  },
}));

vi.mock('./toast/toast-container', () => ({
  __esModule: true,
  TOAST_ROOT_ID: 'newname-confirm-toast-root',
  createContainer: () => {
    const host = {
      remove: vi.fn(),
      style: {},
      setAttribute: vi.fn(),
    } as unknown as HTMLDivElement;
    const mount = {} as HTMLDivElement;
    return {
      host,
      mount,
      shadow: {} as ShadowRoot,
    };
  },
}));

vi.mock('./toast/keyboard-handler', () => ({
  createKeyboardHandler: () => ({
    ensureKeyListener: vi.fn(),
    removeKeyListener: vi.fn(),
  }),
}));

// Avoid asynchronous settings lookups inside the theme manager.
const themeMocks = vi.hoisted(() => ({
  destroyTheme: vi.fn(),
}));
vi.mock('./toast/toast-theme-manager', () => ({
  __esModule: true,
  createThemeManager: (_target: unknown, onThemeChange?: () => void) => {
    onThemeChange?.();
    return {
      destroy: themeMocks.destroyTheme,
      getCurrentTheme: () => 'dark' as const,
    };
  },
}));

const messagingMocks = vi.hoisted(() => ({
  sendConfirmToastDecision: vi.fn(async () => ({ ok: true as const })),
  sendConfirmToastCountdownControl: vi.fn(async () => ({ ok: true as const })),
}));
vi.mock('@/entrypoints/shared/messaging/core-messages', () => ({
  __esModule: true,
  sendConfirmToastDecision: messagingMocks.sendConfirmToastDecision,
  sendConfirmToastCountdownControl:
    messagingMocks.sendConfirmToastCountdownControl,
}));

function createConfirmProposal(
  overrides: Partial<ConfirmToastProposal> = {},
): ConfirmToastProposal {
  const now = Date.now();
  return {
    toastId: 'toast-1',
    createdAt: now,
    historyId: 'history-1',
    downloadId: 'download-1',
    originalFilename: 'original.tmp',
    proposedFilename: 'renamed.pdf',
    proposedPath: '/downloads/renamed.pdf',
    displayProposedPath: '/downloads/renamed.pdf',
    fileType: 'pdf',
    mode: 'balanced',
    reasonTags: [],
    sensitiveReasons: [],
    sensitiveMatches: [],
    triggerSources: [],
    autoApplyAt: now + 10_000,
    autoApplyDelaySeconds: 10,
    allowAutoApply: true,
    allowAlwaysApply: true,
    autoApplyRemainingMs: 10_000,
    ...overrides,
  };
}

function getConfirmToastState() {
  return latestOverlayProps?.confirmToasts ?? [];
}

function getRenameToastState() {
  return latestOverlayProps?.renameToasts ?? [];
}

import {
  ConfirmToastManager,
  resetConfirmToastManagerForTesting,
} from './confirm-toast-manager';

describe('ConfirmToastManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    latestOverlayProps = null;
    messagingMocks.sendConfirmToastDecision.mockClear();
    messagingMocks.sendConfirmToastCountdownControl.mockClear();
    vi.stubGlobal('document', {
      getElementById: vi.fn(() => null),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Document);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    themeMocks.destroyTheme.mockClear();
    resetConfirmToastManagerForTesting();
    vi.unstubAllGlobals();
    renderSpy.mockClear();
    unmountSpy.mockClear();
  });

  it('removes a confirm toast after a successful status update', async () => {
    const manager = new ConfirmToastManager();
    manager.showToast(createConfirmProposal());
    expect(getConfirmToastState()).toHaveLength(1);

    const status: ConfirmToastStatusMessage = {
      toastId: 'toast-1',
      state: 'applied',
    };
    manager.updateStatus(status);

    await vi.runAllTimersAsync();

    expect(getConfirmToastState()).toHaveLength(0);
    manager.destroy();
  });

  it('retains a confirm toast and surfaces the error status', () => {
    const manager = new ConfirmToastManager();
    manager.showToast(createConfirmProposal());
    expect(getConfirmToastState()).toHaveLength(1);

    const status: ConfirmToastStatusMessage = {
      toastId: 'toast-1',
      state: 'error',
      message: 'Downloads permission missing',
    };
    manager.updateStatus(status);

    const [toast] = getConfirmToastState();
    expect(toast).toBeDefined();
    expect(toast?.status).toBe('error');
    expect(toast?.statusMessage).toBe('Downloads permission missing');
    manager.destroy();
  });

  it('pauses and resumes rename toast timers on hover interactions', async () => {
    const manager = new ConfirmToastManager();
    const now = Date.now();
    manager.showRenameResult({
      toastId: 'rename-1',
      createdAt: now,
      originalFilename: 'video.mov',
      finalFilename: 'Vacation.mov',
      downloadId: 'download-1',
      durationMs: 4_000,
    });

    let renameToasts = getRenameToastState();
    expect(renameToasts).toHaveLength(1);
    expect(renameToasts[0]?.paused).toBe(false);

    expect(latestOverlayProps).not.toBeNull();
    latestOverlayProps?.onRenameHoverStart('rename-1');
    renameToasts = getRenameToastState();
    expect(renameToasts[0]?.paused).toBe(true);

    await vi.advanceTimersByTimeAsync(5_000);
    renameToasts = getRenameToastState();
    expect(renameToasts).toHaveLength(1);

    latestOverlayProps?.onRenameHoverEnd('rename-1');
    await vi.runAllTimersAsync();

    expect(getRenameToastState()).toHaveLength(0);
    manager.destroy();
  });

  it('updates confirm toast timing values when notified', () => {
    const manager = new ConfirmToastManager();
    const base = Date.now();
    manager.showToast(
      createConfirmProposal({
        toastId: 'toast-timing',
        autoApplyAt: base + 5_000,
      }),
    );

    let [toast] = getConfirmToastState();
    expect(toast?.autoApplyAt).toBe(base + 5_000);
    expect(toast?.autoApplyRemainingMs).toBe(10_000);

    manager.updateTiming({
      toastId: 'toast-timing',
      autoApplyAt: null,
      autoApplyRemainingMs: 2_500,
    });

    [toast] = getConfirmToastState();
    expect(toast?.autoApplyAt).toBeNull();
    expect(toast?.autoApplyRemainingMs).toBe(2_500);
    manager.destroy();
  });

  it('falls back to approve when always-apply is disabled for the toast', async () => {
    const manager = new ConfirmToastManager();
    manager.showToast(
      createConfirmProposal({
        toastId: 'toast-no-always',
        allowAlwaysApply: false,
      }),
    );

    await Promise.resolve();
    expect(getConfirmToastState()).toHaveLength(1);
    const toastState = getConfirmToastState()[0];
    expect(toastState).toBeDefined();
    const overlay = latestOverlayProps;
    expect(overlay).not.toBeNull();
    if (!toastState || !overlay) {
      throw new Error('toast overlay not available');
    }
    overlay.onAlwaysApply(toastState, 'renamed-final.pdf');

    await Promise.resolve();
    expect(messagingMocks.sendConfirmToastDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        toastId: 'toast-no-always',
        action: 'approve',
        editedFilename: 'renamed-final.pdf',
      }),
    );
    manager.destroy();
  });
});
