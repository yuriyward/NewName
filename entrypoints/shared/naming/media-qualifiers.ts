/**
 * Extract media metadata qualifiers for filename enhancement
 */
import type {
  AudioTrackSummary,
  MediaMetadataSummary,
  VideoTrackSummary,
} from '@/entrypoints/shared/integrations/mediainfo/media-summary';
import type { FileType } from '@/entrypoints/shared/settings/settings';

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
  // Common resolutions with labels
  if (video.width === 1920 && video.height === 1080) return '1080p';
  if (video.width === 1280 && video.height === 720) return '720p';
  if (video.width === 3840 && video.height === 2160) return '4K';
  if (video.width === 2560 && video.height === 1440) return '1440p';
  if (video.width === 854 && video.height === 480) return '480p';
  if (video.width === 640 && video.height === 360) return '360p';
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
  if (audio.channels === 1) return 'Mono';
  if (audio.channels === 2) return 'Stereo';
  if (audio.channels === 6) return '5.1';
  if (audio.channels === 8) return '7.1';
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
  // Common codec abbreviations
  const lower = codec.toLowerCase();
  if (
    lower.includes('avc') ||
    lower.includes('h.264') ||
    lower.includes('h264')
  ) {
    return 'H264';
  }
  if (
    lower.includes('hevc') ||
    lower.includes('h.265') ||
    lower.includes('h265')
  ) {
    return 'H265';
  }
  if (lower.includes('vp9')) return 'VP9';
  if (lower.includes('vp8')) return 'VP8';
  if (lower.includes('av1')) return 'AV1';
  if (lower.includes('aac')) return 'AAC';
  if (lower.includes('mp3')) return 'MP3';
  if (lower.includes('opus')) return 'Opus';
  if (lower.includes('vorbis')) return 'Vorbis';
  if (lower.includes('flac')) return 'FLAC';
  if (lower.includes('xvid')) return 'Xvid';
  if (lower.includes('divx')) return 'DivX';
  if (lower.includes('prores')) return 'ProRes';
  if (lower.includes('dnxhr')) return 'DNxHR';
  if (lower.includes('dnxhd')) return 'DNxHD';
  if (lower.includes('mpeg-4') || lower.includes('mpeg4')) {
    return undefined;
  }
  // Return first word if it's short
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

  if (fileType === 'video') {
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

  if (fileType === 'audio') {
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
