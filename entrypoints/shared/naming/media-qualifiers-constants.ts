/**
 * Constants for media metadata qualifiers
 * Enumerates standard resolutions, audio channels, and codec formats
 */

/**
 * Common video resolutions with their dimensions
 * Used for normalizing video metadata to human-readable labels
 */
export enum VideoResolution {
  RESOLUTION_360P = '360p',
  RESOLUTION_480P = '480p',
  RESOLUTION_720P = '720p',
  RESOLUTION_1080P = '1080p',
  RESOLUTION_1440P = '1440p',
  RESOLUTION_4K = '4K',
}

export interface VideoResolutionDimensions {
  width: number;
  height: number;
  label: VideoResolution;
}

/**
 * Mapping of common video resolutions to their dimensions
 */
export const COMMON_RESOLUTIONS: VideoResolutionDimensions[] = [
  { width: 1920, height: 1080, label: VideoResolution.RESOLUTION_1080P },
  { width: 1280, height: 720, label: VideoResolution.RESOLUTION_720P },
  { width: 3840, height: 2160, label: VideoResolution.RESOLUTION_4K },
  { width: 2560, height: 1440, label: VideoResolution.RESOLUTION_1440P },
  { width: 854, height: 480, label: VideoResolution.RESOLUTION_480P },
  { width: 640, height: 360, label: VideoResolution.RESOLUTION_360P },
];

/**
 * Audio channel configurations
 * Standard mappings for different surround sound formats
 */
export enum AudioChannels {
  MONO = 'Mono',
  STEREO = 'Stereo',
  SURROUND_5_1 = '5.1',
  SURROUND_7_1 = '7.1',
}

export interface AudioChannelMapping {
  channels: number;
  label: AudioChannels;
}

/**
 * Mapping of channel counts to standard audio format labels
 */
export const CHANNEL_MAPPINGS: AudioChannelMapping[] = [
  { channels: 1, label: AudioChannels.MONO },
  { channels: 2, label: AudioChannels.STEREO },
  { channels: 6, label: AudioChannels.SURROUND_5_1 },
  { channels: 8, label: AudioChannels.SURROUND_7_1 },
];

/**
 * Video codec identifiers
 */
export enum VideoCodec {
  H264 = 'H264',
  H265 = 'H265',
  VP9 = 'VP9',
  VP8 = 'VP8',
  AV1 = 'AV1',
  XVID = 'Xvid',
  DIVX = 'DivX',
  PRORES = 'ProRes',
  DNXHR = 'DNxHR',
  DNXHD = 'DNxHD',
}

/**
 * Audio codec identifiers
 */
export enum AudioCodec {
  AAC = 'AAC',
  MP3 = 'MP3',
  OPUS = 'Opus',
  VORBIS = 'Vorbis',
  FLAC = 'FLAC',
}

/**
 * Codec string patterns for matching codec names
 */
export interface CodecPattern {
  patterns: string[];
  codec: VideoCodec | AudioCodec;
}

/**
 * Mapping of codec string patterns to codec enums
 */
export const VIDEO_CODEC_PATTERNS: CodecPattern[] = [
  { patterns: ['avc', 'h.264', 'h264'], codec: VideoCodec.H264 },
  { patterns: ['hevc', 'h.265', 'h265'], codec: VideoCodec.H265 },
  { patterns: ['vp9'], codec: VideoCodec.VP9 },
  { patterns: ['vp8'], codec: VideoCodec.VP8 },
  { patterns: ['av1'], codec: VideoCodec.AV1 },
  { patterns: ['xvid'], codec: VideoCodec.XVID },
  { patterns: ['divx'], codec: VideoCodec.DIVX },
  { patterns: ['prores'], codec: VideoCodec.PRORES },
  { patterns: ['dnxhr'], codec: VideoCodec.DNXHR },
  { patterns: ['dnxhd'], codec: VideoCodec.DNXHD },
];

export const AUDIO_CODEC_PATTERNS: CodecPattern[] = [
  { patterns: ['aac'], codec: AudioCodec.AAC },
  { patterns: ['mp3'], codec: AudioCodec.MP3 },
  { patterns: ['opus'], codec: AudioCodec.OPUS },
  { patterns: ['vorbis'], codec: AudioCodec.VORBIS },
  { patterns: ['flac'], codec: AudioCodec.FLAC },
];

/**
 * Codecs to skip/ignore during formatting
 */
export const SKIP_CODECS = new Set<string>(['mpeg-4', 'mpeg4']);
