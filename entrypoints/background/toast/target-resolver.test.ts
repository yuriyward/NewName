import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { extractTabId, resolveTarget } from './target-resolver';

vi.mock('wxt/browser', () => ({
  browser: fakeBrowser,
}));

describe('target-resolver', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns the tab id when active tab can be resolved', async () => {
    fakeBrowser.tabs.query = vi.fn().mockResolvedValue([{ id: 99 }]);

    const target = await resolveTarget();
    expect(target).toBe(99);
  });

  it('returns undefined when browser query throws', async () => {
    fakeBrowser.tabs.query = vi.fn().mockRejectedValue(new Error('no window'));
    await expect(resolveTarget()).resolves.toBeUndefined();
  });

  it('extracts tab id from numeric or SendMessageOptions targets', () => {
    expect(extractTabId(7)).toBe(7);
    expect(extractTabId({ tabId: 12 })).toBe(12);
    expect(extractTabId(undefined)).toBeUndefined();
    expect(
      extractTabId({ frameId: 3 } as unknown as Parameters<
        typeof extractTabId
      >[0]),
    ).toBeUndefined();
  });
});
