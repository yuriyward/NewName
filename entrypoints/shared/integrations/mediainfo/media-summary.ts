import type {
  AudioTrack,
  GeneralTrack,
  MediaInfoResult,
  VideoTrack,
} from 'mediainfo.js';
import { parseDurationMs } from './parsers/duration-parser';
import {
  type AudioTrackSummary,
  summariseAudioTrack,
  summariseVideoTrack,
  type VideoTrackSummary,
} from './parsers/track-parser';

export type { AudioTrackSummary, VideoTrackSummary };

export interface MediaMetadataSummary {
  readonly general: {
    readonly durationMs?: number;
    readonly format?: string;
    readonly overallBitRateKbps?: number;
    readonly fileSizeBytes?: number;
    readonly title?: string;
  };
  readonly video: VideoTrackSummary[];
  readonly audio: AudioTrackSummary[];
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return undefined;
    const normalized = trimmed.replace(/[^0-9.,-]/g, '').replace(/,/g, '.');
    if (normalized.length === 0) return undefined;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function coerceString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

function kilobitsPerSecond(bitsPerSecond?: number): number | undefined {
  if (!bitsPerSecond || !Number.isFinite(bitsPerSecond)) return undefined;
  if (bitsPerSecond <= 0) return undefined;
  return Math.round(bitsPerSecond / 1000);
}

function pickGeneralFormat(
  track: GeneralTrack | undefined,
): string | undefined {
  if (!track) return undefined;
  return (
    coerceString(track.Format_Commercial) ??
    coerceString(track.Format_String) ??
    coerceString(track.Format)
  );
}

function parseFileSize(track: GeneralTrack | undefined): number | undefined {
  if (!track) return undefined;
  const raw = coerceNumber(track.FileSize);
  if (raw !== undefined) return raw;
  const stringValue =
    coerceString(track.FileSize_String) ??
    coerceString(track.FileSize_String1) ??
    coerceString(track.FileSize_String2) ??
    coerceString(track.FileSize_String3) ??
    coerceString(track.FileSize_String4);
  const parsed = coerceNumber(stringValue);
  return parsed !== undefined && parsed > 0 ? Math.trunc(parsed) : undefined;
}

export function summariseMediaInfo(
  result: MediaInfoResult,
): MediaMetadataSummary {
  const tracks = result.media?.track ?? [];
  const general = tracks.find(
    (track): track is GeneralTrack => track['@type'] === 'General',
  );
  const videoTracks = tracks.filter(
    (track): track is VideoTrack => track['@type'] === 'Video',
  );
  const audioTracks = tracks.filter(
    (track): track is AudioTrack => track['@type'] === 'Audio',
  );

  return {
    general: {
      durationMs: parseDurationMs(general),
      format: pickGeneralFormat(general),
      overallBitRateKbps: kilobitsPerSecond(
        coerceNumber(general?.OverallBitRate),
      ),
      fileSizeBytes: parseFileSize(general),
      title: coerceString(general?.Title) ?? coerceString(general?.Album),
    },
    video: videoTracks.map(summariseVideoTrack),
    audio: audioTracks.map(summariseAudioTrack),
  };
}
