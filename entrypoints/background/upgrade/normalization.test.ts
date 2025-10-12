import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { resolveDownloadItem } from './normalization';

describe('resolveDownloadItem logging context', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  it('logs context when a download item is not found', async () => {
    fakeBrowser.downloads.search = vi.fn().mockResolvedValue([]);
    const warnSpy = vi
      .spyOn(debugLogger, 'warn')
      .mockImplementation(() => undefined);

    await resolveDownloadItem(77, {
      historyId: 'history-123',
      historyPath: 'downloads/sample.txt',
      historyPhase: 'instant-baseline',
      historySource: 'metadata',
    });

    expect(warnSpy).toHaveBeenCalledWith(
      '[UpgradeNormalization] Download item not found',
      expect.objectContaining({
        downloadId: 77,
        historyId: 'history-123',
        historyPath: 'downloads/sample.txt',
        historyPhase: 'instant-baseline',
        historySource: 'metadata',
        reason: 'not-found',
      }),
    );
  });

  it('logs error context when the download payload is invalid', async () => {
    fakeBrowser.downloads.search = vi.fn().mockResolvedValue([
      {
        id: 'bad-id',
        filename: undefined,
      },
    ]);
    const errorSpy = vi
      .spyOn(debugLogger, 'error')
      .mockImplementation(() => undefined);

    const result = await resolveDownloadItem(88, {
      historyId: 'history-999',
    });

    expect(result.status).toBe('failure');
    if (result.status === 'failure') {
      expect(result.reason).toBe('invalid-payload');
    }

    expect(errorSpy).toHaveBeenCalledWith(
      '[UpgradeNormalization] Download item payload invalid',
      expect.objectContaining({
        downloadId: 88,
        historyId: 'history-999',
        reason: 'invalid-payload',
        error: expect.any(Error),
      }),
    );
  });
});
