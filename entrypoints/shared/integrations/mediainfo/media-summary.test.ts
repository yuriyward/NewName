import type {
  AudioTrack,
  GeneralTrack,
  MediaInfoResult,
  VideoTrack,
} from 'mediainfo.js';
import { describe, expect, it } from 'vitest';
import { summariseMediaInfo } from './media-summary';

describe('summariseMediaInfo', () => {
  it('extracts general, video, and audio metadata signals', () => {
    const result = {
      media: {
        '@ref': 'test',
        track: [
          {
            '@type': 'General',
            Duration: 90_123,
            Format: 'MPEG-4',
            OverallBitRate: 2_500_000,
            FileSize: '12345678',
            Title: 'Demo Clip',
          } satisfies GeneralTrack,
          {
            '@type': 'Video',
            Format: 'AVC',
            Format_Profile: 'High@L4',
            CodecID: 'avc1',
            Width: 1_920,
            Height: 1_080,
            FrameRate: 29.97,
            HDR_Format: 'HDR10',
            BitRate: 1_800_000,
          } satisfies VideoTrack,
          {
            '@type': 'Audio',
            Format: 'AAC',
            Format_Profile: 'LC',
            CodecID: 'mp4a-40-2',
            Channels: 2,
            ChannelLayout: 'L R',
            SamplingRate: 48_000,
            BitRate: 384_000,
            Language: 'en',
          } satisfies AudioTrack,
        ],
      },
    } satisfies MediaInfoResult;

    const summary = summariseMediaInfo(result);

    expect(summary.general.durationMs).toBe(90_123);
    expect(summary.general.format).toBe('MPEG-4');
    expect(summary.general.overallBitRateKbps).toBe(2_500);
    expect(summary.general.fileSizeBytes).toBe(12_345_678);
    expect(summary.general.title).toBe('Demo Clip');

    expect(summary.video).toHaveLength(1);
    const [video] = summary.video;
    expect(video.codec).toBe('AVC / avc1');
    expect(video.codecProfile).toBe('High@L4');
    expect(video.width).toBe(1_920);
    expect(video.height).toBe(1_080);
    expect(video.frameRate).toBeCloseTo(29.97);
    expect(video.hdrFormat).toBe('HDR10');
    expect(video.bitRateKbps).toBe(1_800);

    expect(summary.audio).toHaveLength(1);
    const [audio] = summary.audio;
    expect(audio.codec).toBe('AAC / mp4a-40-2');
    expect(audio.codecProfile).toBe('LC');
    expect(audio.channels).toBe(2);
    expect(audio.channelLayout).toBe('L R');
    expect(audio.sampleRateHz).toBe(48_000);
    expect(audio.bitRateKbps).toBe(384);
    expect(audio.language).toBe('en');
  });

  it('handles missing tracks gracefully', () => {
    const result = {
      media: {
        '@ref': 'empty',
        track: [],
      },
    } satisfies MediaInfoResult;
    const summary = summariseMediaInfo(result);
    expect(summary.video).toEqual([]);
    expect(summary.audio).toEqual([]);
    expect(summary.general.durationMs).toBeUndefined();
  });

  it('parses colon-formatted duration strings as milliseconds', () => {
    const result = {
      media: {
        '@ref': 'colon',
        track: [
          {
            '@type': 'General',
            Duration_String3: '00:00:28.237',
          } satisfies GeneralTrack,
        ],
      },
    } satisfies MediaInfoResult;

    const summary = summariseMediaInfo(result);

    expect(summary.general.durationMs).toBe(28_237);
  });

  it('parses tokenized duration strings with units', () => {
    const result = {
      media: {
        '@ref': 'tokens',
        track: [
          {
            '@type': 'General',
            Duration_String: '1 min 30 s 250 ms',
          } satisfies GeneralTrack,
        ],
      },
    } satisfies MediaInfoResult;

    const summary = summariseMediaInfo(result);

    expect(summary.general.durationMs).toBe(90_250);
  });
});
