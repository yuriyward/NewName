/**
 * Main entry point for MediaInfo integration and media file analysis
 */
import type { MediaInfoResult, ReadChunkFunc } from 'mediainfo.js';
import {
  type RangeFetchOptions,
  RangeFetchReader,
} from '@/entrypoints/shared/integrations/range-fetcher';
import { type MediaMetadataSummary, summariseMediaInfo } from './media-summary';
import { getMediaInfoInstance, MEDIAINFO_CHUNK_SIZE } from './mediainfo-loader';

export interface AnalyzeMediaFromUrlOptions extends RangeFetchOptions {
  readonly chunkSize?: number;
}

export interface AnalyzeMediaFromUrlResult {
  readonly raw: MediaInfoResult;
  readonly summary: MediaMetadataSummary;
  readonly fileSize: number;
  readonly bytesFetched: number;
  readonly requests: number;
}

export interface AnalyzeMediaFromBlobResult {
  readonly raw: MediaInfoResult;
  readonly summary: MediaMetadataSummary;
}

export class MediaAnalysisError extends Error {
  readonly metrics: {
    readonly bytesFetched: number;
    readonly requests: number;
  };

  constructor(
    message: string,
    metrics: { bytesFetched: number; requests: number },
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'MediaAnalysisError';
    this.metrics = metrics;
  }
}

async function analyzeWithMediaInfo(
  sizeArg: number | (() => Promise<number>),
  readChunk: ReadChunkFunc,
): Promise<MediaInfoResult> {
  const mediaInfo = await getMediaInfoInstance();
  return mediaInfo.analyzeData(sizeArg, readChunk);
}

export async function analyzeMediaFromUrl(
  url: string,
  options: AnalyzeMediaFromUrlOptions = {},
): Promise<AnalyzeMediaFromUrlResult> {
  const { chunkSize = MEDIAINFO_CHUNK_SIZE, ...fetchOptions } = options;
  const reader = new RangeFetchReader(url, {
    ...fetchOptions,
    chunkSize,
  });

  const sizePromise = reader.ensureSize();
  try {
    const raw = await analyzeWithMediaInfo(
      () => sizePromise,
      (size, offset) => reader.read(size, offset),
    );

    const summary = summariseMediaInfo(raw);
    const fileSize = await sizePromise;

    return {
      raw,
      summary,
      fileSize,
      bytesFetched: reader.bytesFetched,
      requests: reader.requests,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Media analysis failed';
    throw new MediaAnalysisError(
      message,
      {
        bytesFetched: reader.bytesFetched,
        requests: reader.requests,
      },
      error instanceof Error ? { cause: error } : undefined,
    );
  }
}

export async function analyzeMediaFromBlob(
  blob: Blob,
): Promise<AnalyzeMediaFromBlobResult> {
  const readChunk: ReadChunkFunc = async (chunkSize, offset) =>
    new Uint8Array(await blob.slice(offset, offset + chunkSize).arrayBuffer());
  const raw = await analyzeWithMediaInfo(blob.size, readChunk);
  const summary = summariseMediaInfo(raw);
  return { raw, summary };
}

export { MEDIAINFO_CHUNK_SIZE };
