import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { HistoryItem } from '@/entrypoints/shared/history/types';
import { DEFAULT_SETTINGS } from '@/entrypoints/shared/settings/types';
import type { DownloadTrackingEntry } from '../download-tracking';
import type {
  ConfirmToastController,
  ConfirmToastEntry,
} from '../toast/confirmation-controller';
import type { BrowserDownloadDelta } from './types';

vi.mock('wxt/browser', () => ({ browser: fakeBrowser }));

const historyStore = new Map<string, HistoryItem>();

const getHistoryItem = vi.fn(
  async (id: string) => historyStore.get(id) ?? null,
);
const updateHistoryItem = vi.fn(
  async (id: string, apply: (item: HistoryItem) => HistoryItem | null) => {
    const current = historyStore.get(id);
    if (!current) {
      return null;
    }
    const next = apply(current);
    if (!next) {
      return null;
    }
    historyStore.set(id, next);
    return next;
  },
);

vi.mock('@/entrypoints/shared/history/history', () => ({
  __esModule: true,
  getHistoryItem,
  updateHistoryItem,
}));

const mockAiAdapter = {
  summarizer: {
    isSupported: vi.fn(async () => true),
    summarize: vi.fn(async ({ text }: { text: string }) => ({
      summary: `${text} refined insights`,
    })),
  },
  languageDetector: {
    isSupported: vi.fn(async () => true),
    detect: vi.fn(async () => ({ language: 'en', probability: 0.9 })),
  },
  prompt: {
    isSupported: vi.fn(async () => true),
    complete: vi.fn(async ({ prompt }: { prompt: string }) => ({
      output: `[mocked] ${prompt}`,
      finishReason: 'mock' as const,
    })),
  },
};

vi.mock('@/entrypoints/shared/integrations/chrome-ai/adapter', () => ({
  __esModule: true,
  getBuiltInAiAdapter: () => mockAiAdapter,
  createMockBuiltInAiAdapter: () => mockAiAdapter,
  setBuiltInAiAdapter: vi.fn(),
}));

const { createUpgradeCoordinator } = await import('./coordinator');

function createConfirmToastControllerMock(): ConfirmToastController {
  return {
    queueConfirmation: vi.fn(async (options) => {
      const entry: ConfirmToastEntry = {
        proposal: {
          toastId: `toast-${options.historyId}`,
          createdAt: Date.now(),
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
          autoApplyAt: null,
          autoApplyDelaySeconds: options.autoApplyDelaySeconds,
          allowAutoApply: Boolean(options.autoApplyDelaySeconds),
          allowAlwaysApply: options.allowAlwaysApply,
        },
        historyId: options.historyId,
        target: undefined,
      };
      return entry;
    }) as ConfirmToastController['queueConfirmation'],
    handleUserDecision: vi.fn(async () => false),
    cancel: vi.fn(async () => false),
    getPendingByHistory: vi.fn(() => undefined),
    getAllPending: vi.fn(() => []),
    emitStatus: vi.fn(async () => {}),
  };
}

describe('createUpgradeCoordinator', () => {
  beforeEach(() => {
    historyStore.clear();
    getHistoryItem.mockClear();
    updateHistoryItem.mockClear();
    mockAiAdapter.summarizer.summarize.mockClear();
    mockAiAdapter.summarizer.isSupported.mockClear();
    fakeBrowser.reset();
    fakeBrowser.downloads.search = vi.fn().mockResolvedValue([
      {
        id: 42,
        filename: '/Users/test/Downloads/report.pdf',
        state: 'complete',
        bytesReceived: 1024,
        url: 'https://example.com/report.pdf',
      },
    ]);
  });

  it('queues upgrade toast when AI requests rename', async () => {
    const historyItem: HistoryItem = {
      id: 'history-1',
      ts: Date.now(),
      path: 'reports/report.pdf',
      original: 'report.pdf',
      final: 'report.pdf',
      source: 'on-device',
      fileType: 'pdf',
      phase: 'instant-baseline',
      reasonTags: ['Original'],
      decision: {
        outcome: 'keep',
        strategy: 'keep-original',
        confidence: 0,
        guardrail: 'strategy-unavailable',
        reasons: [],
        signals: { inputsUsed: [], missingInputs: [] },
      },
    };

    historyStore.set(historyItem.id, historyItem);

    const confirmController = createConfirmToastControllerMock();
    const coordinator = createUpgradeCoordinator({
      confirmToastController: confirmController,
      readSettings: () => DEFAULT_SETTINGS,
      now: () => new Date('2025-10-11T12:00:00Z').getTime(),
    });

    const delta = {
      id: 42,
      state: { current: 'complete' },
    } as BrowserDownloadDelta;

    const tracking: DownloadTrackingEntry = {
      historyId: historyItem.id,
      filename: historyItem.final,
      url: 'https://example.com/report.pdf',
      createdAt: Date.now(),
    };

    await coordinator.handleDownloadChange(delta, tracking);

    expect(confirmController.queueConfirmation).toHaveBeenCalledTimes(1);
    const updated = historyStore.get(historyItem.id);
    expect(updated?.upgrade?.source).toBe('ai');
    expect(updated?.upgrade?.autoApply).toBe(false);
  });

  it('skips queue when analysis decides to keep original', async () => {
    const historyItem: HistoryItem = {
      id: 'history-2',
      ts: Date.now(),
      path: 'docs/notes.pdf',
      original: 'notes.pdf',
      final: 'notes.pdf',
      source: 'on-device',
      fileType: 'pdf',
      phase: 'instant-baseline',
      reasonTags: ['Original'],
      decision: {
        outcome: 'keep',
        strategy: 'keep-original',
        confidence: 0,
        guardrail: 'strategy-unavailable',
        reasons: [],
        signals: { inputsUsed: [], missingInputs: [] },
      },
    };
    historyStore.set(historyItem.id, historyItem);

    const confirmController = createConfirmToastControllerMock();
    const coordinator = createUpgradeCoordinator({
      confirmToastController: confirmController,
      readSettings: () => DEFAULT_SETTINGS,
      requestAnalysis: async () => null,
    });

    const delta = {
      id: 77,
      state: { current: 'complete' },
    } as BrowserDownloadDelta;

    const tracking: DownloadTrackingEntry = {
      historyId: historyItem.id,
      filename: historyItem.final,
      url: 'https://example.com/notes.pdf',
      createdAt: Date.now(),
    };

    await coordinator.handleDownloadChange(delta, tracking);

    expect(confirmController.queueConfirmation).not.toHaveBeenCalled();
    expect(updateHistoryItem).not.toHaveBeenCalled();
  });

  it('propagates auto-apply recommendation', async () => {
    const historyItem: HistoryItem = {
      id: 'history-3',
      ts: Date.now(),
      path: 'docs/notes.pdf',
      original: 'notes.pdf',
      final: 'notes.pdf',
      source: 'on-device',
      fileType: 'pdf',
      phase: 'instant-baseline',
      reasonTags: ['Original'],
      decision: {
        outcome: 'keep',
        strategy: 'keep-original',
        confidence: 0,
        guardrail: 'strategy-unavailable',
        reasons: [],
        signals: { inputsUsed: [], missingInputs: [] },
      },
    };
    historyStore.set(historyItem.id, historyItem);

    const confirmController = createConfirmToastControllerMock();
    const coordinator = createUpgradeCoordinator({
      confirmToastController: confirmController,
      readSettings: () => DEFAULT_SETTINGS,
      requestAnalysis: async ({ now }) => ({
        proposedFilename: 'notes-summary.pdf',
        proposedPath: 'notes-summary.pdf',
        confidence: 'high',
        autoApply: true,
        reasonTags: ['ai'],
        generatedAt: now,
        source: 'ai',
      }),
    });

    const delta = {
      id: 88,
      state: { current: 'complete' },
    } as BrowserDownloadDelta;

    const tracking: DownloadTrackingEntry = {
      historyId: historyItem.id,
      filename: historyItem.final,
      url: 'https://example.com/notes.pdf',
      createdAt: Date.now(),
    };

    await coordinator.handleDownloadChange(delta, tracking);

    const queueCalls = (
      confirmController.queueConfirmation as ReturnType<typeof vi.fn>
    ).mock.calls;
    expect(queueCalls.length).toBe(1);
    const [{ autoApplyDelaySeconds }] = queueCalls[0];
    expect(autoApplyDelaySeconds).toBe(
      DEFAULT_SETTINGS.confirmToast.autoApplyDelaySeconds,
    );
  });
});
