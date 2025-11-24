import {
  beforeEach,
  describe,
  expect,
  it,
  type MockedFunction,
  vi,
} from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { DEFAULT_SETTINGS } from '@/entrypoints/shared/settings/types';

vi.mock('wxt/browser', () => ({ browser: fakeBrowser }));
vi.mock('@/entrypoints/shared/messaging/core-messages', () => ({
  sendShowRenameToast: vi.fn().mockResolvedValue({ ok: true }),
}));

const { sendShowRenameToast } = await import(
  '@/entrypoints/shared/messaging/core-messages'
);
const sendShowRenameToastMock = sendShowRenameToast as MockedFunction<
  typeof sendShowRenameToast
>;
const { maybeShowRenameOverlay } = await import('./rename-overlay');

describe('maybeShowRenameOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeBrowser.reset();
  });

  it('sends overlay message for instant baseline when enabled', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      confirmToast: {
        ...DEFAULT_SETTINGS.confirmToast,
        renameNotifications: {
          instantBaseline: true,
          contextualUpgrade: false,
        },
      },
      mode: 'balanced' as const,
    };

    fakeBrowser.tabs.query = vi.fn().mockResolvedValue([{ id: 12 }]);

    await maybeShowRenameOverlay({
      settings,
      originalFilename: 'original.pdf',
      finalFilename: 'final.pdf',
      kind: 'instant-baseline',
    });

    expect(sendShowRenameToastMock).toHaveBeenCalledTimes(1);
    const payload = sendShowRenameToastMock.mock.calls[0]?.[0];
    expect(payload.toast.durationMs).toBe(3_000);
  });

  it('skips overlay for instant baseline when disabled', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      confirmToast: {
        ...DEFAULT_SETTINGS.confirmToast,
        renameNotifications: {
          instantBaseline: false,
          contextualUpgrade: true,
        },
      },
    };

    fakeBrowser.tabs.query = vi.fn().mockResolvedValue([{ id: 99 }]);

    await maybeShowRenameOverlay({
      settings,
      originalFilename: 'a',
      finalFilename: 'b',
      kind: 'instant-baseline',
    });

    expect(sendShowRenameToastMock).not.toHaveBeenCalled();
  });

  it('respects contextual upgrade notification toggle', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      confirmToast: {
        ...DEFAULT_SETTINGS.confirmToast,
        renameNotifications: {
          instantBaseline: false,
          contextualUpgrade: true,
        },
      },
    };

    fakeBrowser.tabs.query = vi.fn().mockResolvedValue([{ id: 21 }]);

    await maybeShowRenameOverlay({
      settings,
      originalFilename: 'report.pdf',
      finalFilename: 'report-summary.pdf',
      kind: 'contextual-upgrade',
    });

    expect(sendShowRenameToastMock).toHaveBeenCalledTimes(1);
    const payload = sendShowRenameToastMock.mock.calls[0]?.[0];
    expect(payload.toast.durationMs).toBe(3_000);
  });

  it('does not emit overlay when filename is unchanged', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      confirmToast: {
        ...DEFAULT_SETTINGS.confirmToast,
        renameNotifications: {
          instantBaseline: true,
          contextualUpgrade: true,
        },
      },
    };

    fakeBrowser.tabs.query = vi.fn().mockResolvedValue([{ id: 7 }]);

    await maybeShowRenameOverlay({
      settings,
      originalFilename: 'same.txt',
      finalFilename: 'Same.txt',
      kind: 'instant-baseline',
    });

    expect(sendShowRenameToastMock).not.toHaveBeenCalled();
  });
});
