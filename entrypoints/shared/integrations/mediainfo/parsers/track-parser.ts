/**
 * Track parsing utilities for MediaInfo video and audio tracks
 */
import type { AudioTrack, VideoTrack } from 'mediainfo.js';

/**
 * Coerce a value to a number if possible.
 */
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

/**
 * Coerce a value to a string if possible.
 */
function coerceString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

/**
 * Join unique parts into a single string, separated by " / ".
 */
function uniqueJoin(parts: Array<string | undefined>): string | undefined {
  const seen = new Set<string>();
  for (const part of parts) {
    if (!part) continue;
    const normalized = part.trim();
    if (normalized.length === 0) continue;
    if (!seen.has(normalized)) {
      seen.add(normalized);
    }
  }
  if (seen.size === 0) {
    return undefined;
  }
  return Array.from(seen).join(' / ');
}

/**
 * Convert bits per second to kilobits per second.
 */
function kilobitsPerSecond(bitsPerSecond?: number): number | undefined {
  if (!bitsPerSecond || !Number.isFinite(bitsPerSecond)) return undefined;
  if (bitsPerSecond <= 0) return undefined;
  return Math.round(bitsPerSecond / 1000);
}

export interface VideoTrackSummary {
  readonly codec?: string;
  readonly codecProfile?: string;
  readonly width?: number;
  readonly height?: number;
  readonly frameRate?: number;
  readonly displayAspectRatio?: number;
  readonly hdrFormat?: string;
  readonly bitRateKbps?: number;
}

export interface AudioTrackSummary {
  readonly codec?: string;
  readonly codecProfile?: string;
  readonly channels?: number;
  readonly channelLayout?: string;
  readonly sampleRateHz?: number;
  readonly bitRateKbps?: number;
  readonly language?: string;
}

/**
 * Summarize a video track from MediaInfo data.
 */
export function summariseVideoTrack(track: VideoTrack): VideoTrackSummary {
  const width = coerceNumber(track.Width) ?? coerceNumber(track.Width_Original);
  const height =
    coerceNumber(track.Height) ?? coerceNumber(track.Height_Original);
  return {
    codec: uniqueJoin([
      coerceString(track.Format_Commercial),
      coerceString(track.Format_String) ?? coerceString(track.Format),
      coerceString(track.CodecID_String) ?? coerceString(track.CodecID),
    ]),
    codecProfile:
      coerceString(track.Format_Profile) ?? coerceString(track.Format_Level),
    width,
    height,
    frameRate:
      coerceNumber(track.FrameRate) ?? coerceNumber(track.FrameRate_Original),
    displayAspectRatio:
      coerceNumber(track.DisplayAspectRatio) ??
      coerceNumber(track.PixelAspectRatio),
    hdrFormat:
      coerceString(track.HDR_Format_Commercial) ??
      coerceString(track.HDR_Format_String) ??
      coerceString(track.HDR_Format),
    bitRateKbps: kilobitsPerSecond(coerceNumber(track.BitRate)),
  };
}

/**
 * Summarize an audio track from MediaInfo data.
 */
export function summariseAudioTrack(track: AudioTrack): AudioTrackSummary {
  return {
    codec: uniqueJoin([
      coerceString(track.Format_Commercial),
      coerceString(track.Format_String) ?? coerceString(track.Format),
      coerceString(track.CodecID_String) ?? coerceString(track.CodecID),
    ]),
    codecProfile:
      coerceString(track.Format_Profile) ??
      coerceString(track.Format_Settings_Mode),
    channels:
      coerceNumber(track.Channels) ?? coerceNumber(track.Channels_Original),
    channelLayout:
      coerceString(track.ChannelLayout) ??
      coerceString(track.ChannelPositions_String2),
    sampleRateHz: coerceNumber(track.SamplingRate),
    bitRateKbps: kilobitsPerSecond(
      coerceNumber(track.BitRate) ?? coerceNumber(track.BitRate_Nominal),
    ),
    language:
      coerceString(track.Language_String) ?? coerceString(track.Language),
  };
}
