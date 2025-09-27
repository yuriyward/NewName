import { describe, expect, it } from 'vitest';
import { detectFileType } from './file-types';

describe('detectFileType', () => {
  it('prioritizes explicit MIME mappings', () => {
    expect(detectFileType({ mime: 'application/pdf' })).toBe('pdf');
    expect(detectFileType({ mime: 'image/png' })).toBe('image');
    expect(detectFileType({ mime: 'audio/mpeg' })).toBe('audio');
    expect(detectFileType({ mime: 'video/mp4' })).toBe('video');
    expect(detectFileType({ mime: 'application/zip' })).toBe('archive');
    expect(
      detectFileType({
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    ).toBe('office');
  });

  it('falls back to extension lookups when MIME is missing', () => {
    expect(detectFileType({ extension: 'mp4' })).toBe('video');
    expect(detectFileType({ extension: '.JPG' })).toBe('image');
    expect(detectFileType({ extension: 'csv' })).toBe('data');
  });

  it('returns data when type cannot be determined', () => {
    expect(detectFileType({})).toBe('data');
    expect(detectFileType({ mime: 'application/octet-stream' })).toBe('data');
    expect(detectFileType({ extension: 'unknownext' })).toBe('data');
  });

  it('prefers MIME over mismatched extension hints', () => {
    expect(
      detectFileType({
        mime: 'application/pdf',
        extension: 'jpg',
      }),
    ).toBe('pdf');
  });

  it('detects archive formats from MIME and multi-part extensions', () => {
    expect(detectFileType({ mime: 'application/x-7z-compressed' })).toBe(
      'archive',
    );
    expect(detectFileType({ mime: 'application/x-tar' })).toBe('archive');
    expect(detectFileType({ mime: 'application/x-gzip' })).toBe('archive');
    expect(detectFileType({ extension: 'tar.gz' })).toBe('archive');
    expect(detectFileType({ extension: 'tar.xz' })).toBe('archive');
  });

  it('handles media MIME hints with parameters', () => {
    expect(
      detectFileType({ mime: 'video/x-matroska; codecs="avc1.640028"' }),
    ).toBe('video');
    expect(detectFileType({ mime: 'audio/ogg; codecs=opus' })).toBe('audio');
  });
});
