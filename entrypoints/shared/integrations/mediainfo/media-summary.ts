import type {
  AudioTrack,
  GeneralTrack,
  MediaInfoResult,
  VideoTrack,
} from 'mediainfo.js';

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

function kilobitsPerSecond(bitsPerSecond?: number): number | undefined {
  if (!bitsPerSecond || !Number.isFinite(bitsPerSecond)) return undefined;
  if (bitsPerSecond <= 0) return undefined;
  return Math.round(bitsPerSecond / 1000);
}

function summariseVideoTrack(track: VideoTrack): VideoTrackSummary {
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

function summariseAudioTrack(track: AudioTrack): AudioTrackSummary {
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
      durationMs: coerceNumber(general?.Duration),
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
