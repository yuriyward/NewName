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

function parseDurationFromTokens(input: string): number | undefined {
  const durationRegex =
    /([\d.,]+)\s*(h|hr|hrs|hour|hours|mn|min|mins|minute|minutes|s|sec|secs|second|seconds|ms|millisecond|milliseconds|us|µs|μs)/gi;
  let totalMs = 0;
  let matched = false;

  for (const match of input.matchAll(durationRegex)) {
    const [, rawValue, rawUnit] = match;
    const value = Number.parseFloat(rawValue.replace(/,/g, '.'));
    if (!Number.isFinite(value) || value < 0) {
      continue;
    }
    const unit = rawUnit.toLowerCase();
    let multiplier = 0;
    if (
      unit === 'h' ||
      unit === 'hr' ||
      unit === 'hrs' ||
      unit === 'hour' ||
      unit === 'hours'
    ) {
      multiplier = 3_600_000;
    } else if (
      unit === 'mn' ||
      unit === 'min' ||
      unit === 'mins' ||
      unit === 'minute' ||
      unit === 'minutes'
    ) {
      multiplier = 60_000;
    } else if (
      unit === 's' ||
      unit === 'sec' ||
      unit === 'secs' ||
      unit === 'second' ||
      unit === 'seconds'
    ) {
      multiplier = 1_000;
    } else if (
      unit === 'ms' ||
      unit === 'millisecond' ||
      unit === 'milliseconds'
    ) {
      multiplier = 1;
    } else if (unit === 'us' || unit === 'µs' || unit === 'μs') {
      multiplier = 0.001;
    }

    if (multiplier > 0) {
      totalMs += value * multiplier;
      matched = true;
    }
  }

  if (!matched) {
    return undefined;
  }

  return totalMs > 0 ? Math.round(totalMs) : undefined;
}

function parseColonDuration(input: string): number | undefined {
  const candidate = input.split(/\s+/).find((segment) => segment.includes(':'));
  if (!candidate) {
    return undefined;
  }

  const tokens = candidate.split(':');
  if (tokens.length < 2) {
    return undefined;
  }

  const normalize = (value: string): number | undefined => {
    const cleaned = value.replace(/[^\d.,-]/g, '').replace(/,/g, '.');
    if (cleaned.length === 0) return undefined;
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const secondsToken = tokens.pop();
  if (!secondsToken) {
    return undefined;
  }

  const seconds = normalize(secondsToken);
  if (seconds === undefined) {
    return undefined;
  }

  let totalSeconds = seconds;
  const minutesToken = tokens.pop();
  if (minutesToken !== undefined) {
    const minutes = normalize(minutesToken) ?? 0;
    totalSeconds += minutes * 60;
  }
  const hoursToken = tokens.pop();
  if (hoursToken !== undefined) {
    const hours = normalize(hoursToken) ?? 0;
    totalSeconds += hours * 3_600;
  }

  return totalSeconds > 0 ? Math.round(totalSeconds * 1_000) : undefined;
}

function pickDurationStrings(track: GeneralTrack | undefined): string[] {
  if (!track) return [];
  const candidates: Array<unknown> = [
    track.Duration_String3,
    track.Duration_String,
    track.Duration_String1,
    track.Duration_String2,
    track.Duration_String4,
    track.Duration_String5,
  ];
  const sourceKeys = [
    'Source_Duration_String3',
    'Source_Duration_String',
    'Source_Duration_String1',
    'Source_Duration_String2',
    'Source_Duration_String4',
    'Source_Duration_String5',
  ] as const;
  for (const key of sourceKeys) {
    const value = Reflect.get(track, key);
    if (value !== undefined) {
      candidates.push(value);
    }
  }
  return candidates
    .map((value) => coerceString(value))
    .filter((value): value is string => typeof value === 'string');
}

function parseDurationMs(track: GeneralTrack | undefined): number | undefined {
  if (!track) return undefined;

  const raw = track.Duration;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw > 0 && raw >= 1_000) {
      return Math.round(raw);
    }

    const supplemental = pickDurationStrings(track);
    for (const entry of supplemental) {
      if (/\bms\b/i.test(entry)) {
        return Math.round(raw);
      }
      const colonParsed = parseColonDuration(entry);
      if (colonParsed !== undefined) {
        return colonParsed;
      }
      const tokenParsed = parseDurationFromTokens(entry);
      if (tokenParsed !== undefined) {
        return tokenParsed;
      }
      if (/(?:^|\s)s(ec|econd)?s?\b/i.test(entry) || /:/.test(entry)) {
        return Math.round(raw * 1_000);
      }
    }

    if (raw > 0) {
      return Math.round(raw * 1_000);
    }
    return undefined;
  }

  const stringCandidates = pickDurationStrings(track);
  for (const candidate of stringCandidates) {
    const colonParsed = parseColonDuration(candidate);
    if (colonParsed !== undefined) {
      return colonParsed;
    }
    const tokenParsed = parseDurationFromTokens(candidate);
    if (tokenParsed !== undefined) {
      return tokenParsed;
    }
  }

  const sourceDuration = track
    ? Reflect.get(track, 'Source_Duration')
    : undefined;
  if (typeof sourceDuration === 'number' && Number.isFinite(sourceDuration)) {
    if (sourceDuration >= 1_000) {
      return Math.round(sourceDuration);
    }
    return sourceDuration > 0 ? Math.round(sourceDuration * 1_000) : undefined;
  }

  return undefined;
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
