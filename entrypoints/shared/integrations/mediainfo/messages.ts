import type { MediaInfoResult } from 'mediainfo.js';
import type { FileType } from '@/entrypoints/shared/settings/settings';
import type { MediaDebugSettings } from './debug';
import type { MediaMetadataSummary } from './media-summary';

export interface MediaAnalysisRequest {
  readonly requestId: string;
  readonly historyId: string;
  readonly downloadId?: string;
  readonly url: string;
  readonly originalFilename: string;
  readonly fileType: Extract<FileType, 'audio' | 'video'>;
  readonly chunkSize?: number;
  readonly debug?: MediaDebugSettings;
}

export interface MediaAnalysisSuccess {
  readonly status: 'success';
  readonly requestId: string;
  readonly summary: MediaMetadataSummary;
  readonly raw: MediaInfoResult;
  readonly metrics: {
    readonly fileSize: number;
    readonly bytesFetched: number;
    readonly requests: number;
    readonly elapsedMs: number;
    readonly chunkSize: number;
  };
}

export interface MediaAnalysisFailure {
  readonly status: 'error';
  readonly requestId: string;
  readonly error: string;
  readonly details?: string;
  readonly metrics: {
    readonly bytesFetched: number;
    readonly requests: number;
    readonly elapsedMs: number;
  };
}

export type MediaAnalysisResponse = MediaAnalysisSuccess | MediaAnalysisFailure;
