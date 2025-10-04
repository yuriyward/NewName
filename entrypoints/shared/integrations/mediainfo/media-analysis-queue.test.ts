import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  offscreenHandshake,
  requestMediaAnalysis,
} from '@/entrypoints/shared/messaging/extension-messaging';
import {
  enqueueMediaAnalysis,
  resetMediaAnalysisQueueForTesting,
} from './media-analysis-queue';
import type { MediaAnalysisRequest } from './messages';
import { resetOffscreenCoordinatorForTesting } from './offscreen-coordinator';

vi.mock(
  '@/entrypoints/shared/messaging/extension-messaging',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('@/entrypoints/shared/messaging/extension-messaging')
      >();
    return {
      ...actual,
      requestMediaAnalysis: vi.fn(),
      offscreenHandshake: vi.fn().mockResolvedValue({ ready: true }),
      onExtensionMessage: actual.onExtensionMessage,
    };
  },
);

const requestMediaAnalysisMock = vi.mocked(requestMediaAnalysis);
const offscreenHandshakeMock = vi.mocked(offscreenHandshake);

type OffscreenApi = NonNullable<typeof browser.offscreen>;

describe('enqueueMediaAnalysis', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetMediaAnalysisQueueForTesting();
    resetOffscreenCoordinatorForTesting();

    if (!browser.offscreen) {
      browser.offscreen = {} as OffscreenApi;
    }
    const offscreen = browser.offscreen as OffscreenApi;
    let documentCreated = false;
    const hasDocumentMock = vi.fn().mockImplementation(async () => {
      return documentCreated;
    });
    offscreen.hasDocument = hasDocumentMock;
    const createDocumentMock = vi.fn(
      (
        parameters: Parameters<OffscreenApi['createDocument']>[0],
        callback?: Parameters<OffscreenApi['createDocument']>[1],
      ) => {
        void parameters; // parameters unused in tests
        documentCreated = true; // Mark document as created
        if (callback) {
          callback();
          return;
        }
        return Promise.resolve();
      },
    ) as unknown as OffscreenApi['createDocument'];
    offscreen.createDocument = createDocumentMock;

    requestMediaAnalysisMock.mockReset();
    offscreenHandshakeMock.mockReset();
    offscreenHandshakeMock.mockResolvedValue({ ready: true });
  });

  it('creates offscreen document and forwards request', async () => {
    requestMediaAnalysisMock.mockResolvedValue({
      status: 'success',
      requestId: 'req-1',
      summary: {
        general: { durationMs: 1000, format: 'MP4', overallBitRateKbps: 5000 },
        video: [],
        audio: [],
      },
      raw: { media: { '@ref': 'ref', track: [] } },
      metrics: {
        fileSize: 1024,
        bytesFetched: 1024,
        requests: 1,
        elapsedMs: 40,
        chunkSize: 512_000,
      },
    });

    const request: MediaAnalysisRequest = {
      requestId: 'req-1',
      historyId: 'history-1',
      url: 'https://example.com/video.mp4',
      originalFilename: 'video.mp4',
      fileType: 'video',
    };

    const result = await enqueueMediaAnalysis(request);

    expect(result.status).toBe('success');
    expect(requestMediaAnalysisMock).toHaveBeenCalledTimes(1);
    expect(requestMediaAnalysisMock).toHaveBeenCalledWith(request);
    expect(browser.offscreen?.createDocument).toHaveBeenCalledTimes(1);
  });

  it('reuses the same offscreen document for sequential jobs', async () => {
    // First request creates document, second reuses it
    requestMediaAnalysisMock
      .mockResolvedValueOnce({
        status: 'success',
        requestId: 'req-1',
        summary: { general: {}, video: [], audio: [] },
        raw: { media: { '@ref': 'ref', track: [] } },
        metrics: {
          fileSize: 1,
          bytesFetched: 1,
          requests: 1,
          elapsedMs: 10,
          chunkSize: 512_000,
        },
      })
      .mockResolvedValueOnce({
        status: 'success',
        requestId: 'req-2',
        summary: { general: {}, video: [], audio: [] },
        raw: { media: { '@ref': 'ref', track: [] } },
        metrics: {
          fileSize: 2,
          bytesFetched: 2,
          requests: 1,
          elapsedMs: 20,
          chunkSize: 512_000,
        },
      });

    const requestA: MediaAnalysisRequest = {
      requestId: 'req-1',
      historyId: 'history-a',
      url: 'https://example.com/a.mp4',
      originalFilename: 'a.mp4',
      fileType: 'video',
    };
    const requestB: MediaAnalysisRequest = {
      requestId: 'req-2',
      historyId: 'history-b',
      url: 'https://example.com/b.mp4',
      originalFilename: 'b.mp4',
      fileType: 'video',
    };

    // Run first request (creates document)
    await enqueueMediaAnalysis(requestA);
    expect(browser.offscreen?.createDocument).toHaveBeenCalledTimes(1);

    // Reset mock to track second call
    requestMediaAnalysisMock.mockClear();

    // Run second request (reuses document)
    await enqueueMediaAnalysis(requestB);
    expect(browser.offscreen?.createDocument).toHaveBeenCalledTimes(1); // Still 1
    expect(requestMediaAnalysisMock).toHaveBeenCalledTimes(1);
  });
});
