import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SensitiveReason } from '@/entrypoints/shared/classification/sensitive-content';
import type {
  ConfirmToastControllerHooks,
  ConfirmToastEntry,
} from './confirm-toast-controller';

const sendShowConfirmToast = vi.hoisted(() =>
  vi.fn<(payload: unknown, target: unknown) => Promise<{ ok: true }>>(() =>
    Promise.resolve({ ok: true }),
  ),
);
const emitStatus = vi.hoisted(() =>
  vi.fn<(entry: unknown, state: unknown, message?: unknown) => Promise<void>>(
    () => Promise.resolve(),
  ),
);
const resolveTarget = vi.hoisted(() =>
  vi.fn<() => Promise<number | undefined>>(() => Promise.resolve(42)),
);
const extractTabId = vi.hoisted(() =>
  vi.fn<(target: unknown) => number | undefined>(() => 42),
);

const idCounter = vi.hoisted(() => ({ value: 0 }));

vi.mock('@/entrypoints/shared/messaging/extension-messaging', () => ({
  __esModule: true,
  sendShowConfirmToast,
}));

vi.mock('./toast/status-broadcaster', () => ({
  __esModule: true,
  emitStatus,
}));

vi.mock('./toast/target-resolver', () => ({
  __esModule: true,
  resolveTarget,
  extractTabId,
}));

vi.mock('@/entrypoints/shared/utils/id', () => ({
  __esModule: true,
  randomId: () => `toast-${++idCounter.value}`,
}));

const { createConfirmToastController } = await import(
  './confirm-toast-controller'
);

const BASE_OPTIONS = {
  historyId: 'history-1',
  downloadId: 'download-1',
  originalFilename: 'original.pdf',
  proposedFilename: 'renamed.pdf',
  proposedPath: '/downloads/renamed.pdf',
  fileType: 'pdf' as const,
  mode: 'balanced' as const,
  reasonTags: ['Legal'],
  sensitiveReasons: ['legal-document'] as SensitiveReason[],
  sensitiveMatches: [],
  triggerSources: [],
  allowAlwaysApply: true,
};

function createHooks(): {
  hooks: ConfirmToastControllerHooks;
  onUserDecision: ReturnType<typeof vi.fn>;
  onAutoApply: ReturnType<typeof vi.fn>;
} {
  const onUserDecision = vi.fn<ConfirmToastControllerHooks['onUserDecision']>(
    async () => {},
  );
  const onAutoApply = vi.fn<ConfirmToastControllerHooks['onAutoApply']>(
    async () => {},
  );
  return {
    onUserDecision,
    onAutoApply,
    hooks: {
      onUserDecision,
      onAutoApply,
    },
  };
}

function assertEntry(
  value: ConfirmToastEntry | null,
): asserts value is ConfirmToastEntry {
  if (!value) {
    throw new Error('Expected confirm toast entry to be present');
  }
}

describe('createConfirmToastController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-10-10T12:00:00Z'));
    sendShowConfirmToast.mockClear();
    emitStatus.mockClear();
    resolveTarget.mockClear();
    extractTabId.mockClear();
    resolveTarget.mockResolvedValue(42);
    extractTabId.mockReturnValue(42);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('queues confirmation and schedules auto-apply when delay provided', async () => {
    const { hooks, onAutoApply } = createHooks();
    onAutoApply.mockImplementation(async (_entry, helpers) => {
      await helpers.emitStatus('applied');
    });
    const controller = createConfirmToastController(hooks);

    const entry = await controller.queueConfirmation({
      ...BASE_OPTIONS,
      autoApplyDelaySeconds: 1,
    });
    assertEntry(entry);

    expect(entry.proposal.allowAutoApply).toBe(true);
    expect(entry.proposal.autoApplyAt).toBe(Date.now() + 1_000);
    expect(entry.visibleOnTabs?.has(42)).toBe(true);
    expect(sendShowConfirmToast).toHaveBeenCalledWith(
      { proposal: entry.proposal },
      42,
    );

    expect(controller.getPendingByHistory(BASE_OPTIONS.historyId)).toBe(entry);
    expect(controller.getAllPending()).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1_000);

    expect(onAutoApply).toHaveBeenCalledTimes(1);
    expect(onAutoApply.mock.calls[0]?.[0]).toBe(entry);
    expect(emitStatus).toHaveBeenCalledWith(entry, 'applied', undefined);
    expect(
      controller.getPendingByHistory(BASE_OPTIONS.historyId),
    ).toBeUndefined();
  });

  it('handles user decision and removes the pending entry', async () => {
    const { hooks, onUserDecision } = createHooks();
    const controller = createConfirmToastController(hooks);
    const entry = await controller.queueConfirmation({
      ...BASE_OPTIONS,
      autoApplyDelaySeconds: null,
    });
    assertEntry(entry);
    const decision = {
      toastId: entry.proposal.toastId,
      historyId: entry.proposal.historyId,
      downloadId: entry.proposal.downloadId,
      action: 'approve' as const,
    };

    const handled = await controller.handleUserDecision(decision);

    expect(handled).toBe(true);
    expect(onUserDecision).toHaveBeenCalledTimes(1);
    expect(onUserDecision.mock.calls[0]?.[0]).toEqual(entry);
    expect(onUserDecision.mock.calls[0]?.[1]).toEqual(decision);
    expect(
      controller.getPendingByHistory(BASE_OPTIONS.historyId),
    ).toBeUndefined();
    expect(controller.getAllPending()).toHaveLength(0);
  });

  it('returns false when handling decision for unknown toast', async () => {
    const { hooks } = createHooks();
    const controller = createConfirmToastController(hooks);
    const handled = await controller.handleUserDecision({
      toastId: 'missing',
      historyId: 'missing',
      action: 'approve',
    });
    expect(handled).toBe(false);
  });

  it('cancels pending toast and emits status when requested', async () => {
    const { hooks } = createHooks();
    const controller = createConfirmToastController(hooks);
    const entry = await controller.queueConfirmation({
      ...BASE_OPTIONS,
      historyId: 'history-2',
      autoApplyDelaySeconds: null,
    });
    assertEntry(entry);
    const result = await controller.cancel(
      entry.proposal.toastId,
      'kept',
      'user cancel',
    );

    expect(result).toBe(true);
    expect(emitStatus).toHaveBeenCalledWith(entry, 'kept', 'user cancel');
    expect(controller.getPendingByHistory('history-2')).toBeUndefined();
  });

  it('ignores cancel call for unknown toast id', async () => {
    const { hooks } = createHooks();
    const controller = createConfirmToastController(hooks);
    const result = await controller.cancel('unknown');
    expect(result).toBe(false);
  });

  it('propagates errors when toast target cannot be resolved', async () => {
    resolveTarget.mockResolvedValue(undefined);
    extractTabId.mockReturnValue(undefined);
    const { hooks } = createHooks();
    const controller = createConfirmToastController(hooks);

    await expect(
      controller.queueConfirmation({
        ...BASE_OPTIONS,
        historyId: 'history-error',
        autoApplyDelaySeconds: null,
      }),
    ).rejects.toThrow('[ConfirmToast] Missing tab target');
  });
});
