import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { DEFAULT_SETTINGS } from '@/entrypoints/shared/settings/types';

vi.mock('wxt/browser', () => ({ browser: fakeBrowser }));
vi.mock('@/entrypoints/shared/messaging/extension-messaging', () => ({
  sendShowRenameToast: vi.fn().mockResolvedValue({ ok: true }),
}));

const { sendShowRenameToast } =
  await import('@/entrypoints/shared/messaging/extension-messaging');
const { maybeShowRenameOverlay } = await import('./rename-overlay');

describe('maybeShowRenameOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeBrowser.reset();
  });

  it('sends overlay message when enabled and tab present', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      confirmToast: {
        ...DEFAULT_SETTINGS.confirmToast,
        showRenameNotifications: true,
      },
      mode: 'balanced' as const,
    };

    fakeBrowser.tabs.query = vi.fn().mockResolvedValue([{ id: 12 }]);

    await maybeShowRenameOverlay({
      settings,
      originalFilename: 'original.pdf',
      finalFilename: 'final.pdf',
    });

    expect(sendShowRenameToast).toHaveBeenCalledTimes(1);
  });

  it('skips overlay when disabled in settings', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      confirmToast: {
        ...DEFAULT_SETTINGS.confirmToast,
        showRenameNotifications: false,
      },
    };

    fakeBrowser.tabs.query = vi.fn().mockResolvedValue([{ id: 99 }]);

    await maybeShowRenameOverlay({
      settings,
      originalFilename: 'a',
      finalFilename: 'b',
    });

    expect(sendShowRenameToast).not.toHaveBeenCalled();
  });
});
