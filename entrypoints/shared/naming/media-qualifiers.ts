/**
 * Extract media metadata qualifiers for filename enhancement
 */
import type {
  AudioTrackSummary,
  MediaMetadataSummary,
  VideoTrackSummary,
} from '@/entrypoints/shared/integrations/mediainfo/media-summary';
import {
  AUDIO_CODEC_PATTERNS,
  CHANNEL_MAPPINGS,
  COMMON_RESOLUTIONS,
  SKIP_CODECS,
  VIDEO_CODEC_PATTERNS,
} from '@/entrypoints/shared/naming/media-qualifiers-constants';
import type { FileType } from '@/entrypoints/shared/settings/settings';
import { FileTypeEnum } from '@/entrypoints/shared/settings/types';

export interface MediaQualifiers {
  specs: string[];
  format?: string;
  duration?: string;
}

function formatDuration(durationMs: number | undefined): string | undefined {
  if (!durationMs || durationMs <= 0) return undefined;
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins}m`;
  }
  if (minutes > 0) {
    return `${minutes}m${seconds > 0 ? `${seconds}s` : ''}`;
  }
  return `${seconds}s`;
}

function formatResolution(
  video: VideoTrackSummary | undefined,
): string | undefined {
  if (!video?.width || !video?.height) return undefined;
  // Look up common resolutions from centralized constants
  const resolution = COMMON_RESOLUTIONS.find(
    (res) => res.width === video.width && res.height === video.height,
  );
  if (resolution) return resolution.label;
  // Otherwise show dimensions
  return `${video.width}x${video.height}`;
}

function formatFrameRate(
  video: VideoTrackSummary | undefined,
): string | undefined {
  if (!video?.frameRate) return undefined;
  const fps = Math.round(video.frameRate);
  return `${fps}fps`;
}

function formatChannels(
  audio: AudioTrackSummary | undefined,
): string | undefined {
  if (!audio?.channels) return undefined;
  // Look up standard channel configurations from centralized constants
  const channelMapping = CHANNEL_MAPPINGS.find(
    (mapping) => mapping.channels === audio.channels,
  );
  if (channelMapping) return channelMapping.label;
  // Otherwise show channel count
  return `${audio.channels}ch`;
}

function formatSampleRate(
  audio: AudioTrackSummary | undefined,
): string | undefined {
  if (!audio?.sampleRateHz) return undefined;
  const khz = audio.sampleRateHz / 1000;
  if (khz === Math.floor(khz)) {
    return `${Math.floor(khz)}kHz`;
  }
  return `${khz.toFixed(1)}kHz`;
}

function shortenCodec(codec: string | undefined): string | undefined {
  if (!codec) return undefined;
  const lower = codec.toLowerCase();

  // Check against skip list
  if (
    SKIP_CODECS.has(lower) ||
    lower.includes('mpeg-4') ||
    lower.includes('mpeg4')
  ) {
    return undefined;
  }

  // Try to match against known patterns (video first, then audio)
  for (const pattern of VIDEO_CODEC_PATTERNS) {
    if (pattern.patterns.some((p) => lower.includes(p))) {
      return pattern.codec;
    }
  }

  for (const pattern of AUDIO_CODEC_PATTERNS) {
    if (pattern.patterns.some((p) => lower.includes(p))) {
      return pattern.codec;
    }
  }

  // No recognized codec found
  return undefined;
}

export function extractMediaQualifiers(
  summary: MediaMetadataSummary,
  fileType: Extract<FileType, 'audio' | 'video'>,
): MediaQualifiers {
  const specs: string[] = [];
  const primaryVideo = summary.video[0];
  const primaryAudio = summary.audio[0];

  // Format (if available and concise)
  const format = summary.general.format;

  // Duration (always useful for media)
  const duration = formatDuration(summary.general.durationMs);

  if (fileType === FileTypeEnum.VIDEO) {
    // Video specs: resolution, fps, video codec
    const resolution = formatResolution(primaryVideo);
    if (resolution) specs.push(resolution);

    const fps = formatFrameRate(primaryVideo);
    if (fps) specs.push(fps);

    const videoCodec = shortenCodec(primaryVideo?.codec);
    if (videoCodec) specs.push(videoCodec);

    // Audio info for video (channels)
    const channels = formatChannels(primaryAudio);
    if (channels && channels !== 'Stereo') {
      // Only include if not default stereo
      specs.push(channels);
    }
  }

  if (fileType === FileTypeEnum.AUDIO) {
    // Audio specs: sample rate, channels, codec
    const sampleRate = formatSampleRate(primaryAudio);
    if (sampleRate) specs.push(sampleRate);

    const channels = formatChannels(primaryAudio);
    if (channels) specs.push(channels);

    const audioCodec = shortenCodec(primaryAudio?.codec);
    if (audioCodec) specs.push(audioCodec);
  }

  return {
    specs,
    format,
    duration,
  };
}
