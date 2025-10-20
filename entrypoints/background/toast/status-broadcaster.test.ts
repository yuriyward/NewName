import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfirmToastProposal } from '@/entrypoints/shared/toast/types';
import { emitStatus } from './status-broadcaster';

const sendConfirmToastStatus = vi.hoisted(() =>
  vi.fn<(payload: unknown, target: unknown) => Promise<{ ok: true }>>(() =>
    Promise.resolve({ ok: true }),
  ),
);

vi.mock('@/entrypoints/shared/messaging/core-messages', () => ({
  __esModule: true,
  sendConfirmToastStatus,
}));

const proposal: ConfirmToastProposal = {
  toastId: 'toast-1',
  createdAt: Date.now(),
  historyId: 'history-1',
  originalFilename: 'report.pdf',
  proposedFilename: 'renamed.pdf',
  proposedPath: '/downloads/renamed.pdf',
  displayProposedPath: '/downloads/renamed.pdf',
  fileType: 'pdf',
  mode: 'balanced',
  reasonTags: [],
  sensitiveReasons: [],
  sensitiveMatches: [],
  triggerSources: [],
  autoApplyAt: null,
  autoApplyDelaySeconds: null,
  allowAutoApply: false,
  allowAlwaysApply: true,
  autoApplyRemainingMs: null,
};

describe('emitStatus', () => {
  beforeEach(() => {
    sendConfirmToastStatus.mockClear();
  });

  it('sends status message to every visible tab', async () => {
    await emitStatus(
      {
        proposal,
        visibleOnTabs: new Set([1, 2]),
      },
      'applied',
    );

    expect(sendConfirmToastStatus).toHaveBeenCalledTimes(2);
    expect(sendConfirmToastStatus).toHaveBeenNthCalledWith(
      1,
      { toastId: 'toast-1', state: 'applied', message: undefined },
      1,
    );
    expect(sendConfirmToastStatus).toHaveBeenNthCalledWith(
      2,
      { toastId: 'toast-1', state: 'applied', message: undefined },
      2,
    );
  });

  it('ignores entries without any visible tabs', async () => {
    await emitStatus(
      {
        proposal,
        visibleOnTabs: new Set(),
      },
      'dismissed',
      'No tabs',
    );

    expect(sendConfirmToastStatus).not.toHaveBeenCalled();
  });

  it('continues broadcasting when a tab send fails', async () => {
    sendConfirmToastStatus
      .mockRejectedValueOnce(new Error('tab offline'))
      .mockResolvedValueOnce({ ok: true });

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});
    try {
      await emitStatus(
        {
          proposal,
          visibleOnTabs: new Set([3, 4]),
        },
        'timeout',
      );
    } finally {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    }

    expect(sendConfirmToastStatus).toHaveBeenCalledTimes(2);
  });
});
