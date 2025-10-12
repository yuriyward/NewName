import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { addHistoryItem, updateHistoryItem } from './history';
import type { HistoryItem } from './types';

function createBaseHistoryItem(): HistoryItem {
  const now = Date.now();
  return {
    id: 'history-1',
    ts: now,
    path: 'downloads/sample.mp4',
    original: 'sample.mp4',
    final: 'sample-final.mp4',
    source: 'metadata',
    fileType: 'video',
    phase: 'instant-baseline',
    reasonTags: ['PageTitle'],
  };
}

describe('history media metadata updates', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('attaches media metadata to an existing history item', async () => {
    const baseItem = createBaseHistoryItem();
    await addHistoryItem(baseItem);

    const summary = {
      general: {
        durationMs: 1_234,
        format: 'MPEG-4',
        overallBitRateKbps: 2_500,
        fileSizeBytes: 12_345,
        title: 'Demo Clip',
      },
      video: [
        {
          codec: 'AVC',
          codecProfile: 'Main',
          width: 1_920,
          height: 1_080,
          frameRate: 30,
          displayAspectRatio: 16 / 9,
          hdrFormat: undefined,
          bitRateKbps: 1_800,
        },
      ],
      audio: [
        {
          codec: 'AAC',
          codecProfile: 'LC',
          channels: 2,
          channelLayout: 'L R',
          sampleRateHz: 48_000,
          bitRateKbps: 192,
          language: 'en',
        },
      ],
    };

    const updated = await updateHistoryItem(baseItem.id, (item) => ({
      ...item,
      media: {
        status: 'success',
        analyzedAt: 99,
        requestId: 'req-1',
        url: 'https://example.com/sample.mp4',
        metrics: {
          bytesFetched: 65_536,
          requests: 2,
          elapsedMs: 250,
          fileSize: 1_048_576,
          chunkSize: 524_288,
        },
        summary,
      },
    }));

    expect(updated?.media?.status).toBe('success');
    expect(updated?.media?.summary).toEqual(summary);

    const stored = await fakeBrowser.storage.local.get('history.v1');
    const [persisted] = (stored['history.v1'] as HistoryItem[]) ?? [];
    expect(persisted?.media?.metrics.bytesFetched).toBe(65_536);
    expect(persisted?.media?.summary?.video).toHaveLength(1);
  });

  it('rejects invalid media metadata updates', async () => {
    const baseItem = createBaseHistoryItem();
    await addHistoryItem(baseItem);

    await expect(
      updateHistoryItem(baseItem.id, (item) => ({
        ...item,
        media: {
          status: 'success',
          analyzedAt: -1,
          requestId: 'req-2',
          url: 'https://example.com/sample.mp4',
          metrics: {
            bytesFetched: -5,
            requests: 1,
            elapsedMs: 100,
          },
        },
      })),
    ).rejects.toThrowError('Invalid history item update');
  });
});

describe('history pending upgrade analysis updates', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('persists pending upgrade analysis with a valid downloadId', async () => {
    const baseItem = createBaseHistoryItem();
    await addHistoryItem(baseItem);

    const scheduledAt = Date.now() + 500;

    const updated = await updateHistoryItem(baseItem.id, (item) => ({
      ...item,
      pendingUpgradeAnalysis: {
        downloadId: 123,
        scheduledAt,
        reason: 'mock-delayed-upgrade',
      },
    }));

    expect(updated?.pendingUpgradeAnalysis?.downloadId).toBe(123);
    expect(updated?.pendingUpgradeAnalysis?.scheduledAt).toBe(scheduledAt);
  });

  it('rejects pending upgrade analysis with an invalid downloadId', async () => {
    const baseItem = createBaseHistoryItem();
    await addHistoryItem(baseItem);

    await expect(
      updateHistoryItem(baseItem.id, (item) => ({
        ...item,
        pendingUpgradeAnalysis: {
          downloadId: -1,
          scheduledAt: Date.now() + 1_000,
          reason: 'mock-delayed-upgrade',
        },
      })),
    ).rejects.toThrowError('Invalid history item update');

    await expect(
      updateHistoryItem(baseItem.id, (item) => ({
        ...item,
        pendingUpgradeAnalysis: {
          downloadId: Number.MAX_SAFE_INTEGER + 1,
          scheduledAt: Date.now() + 1_000,
          reason: 'mock-delayed-upgrade',
        },
      })),
    ).rejects.toThrowError('Invalid history item update');
  });
});
