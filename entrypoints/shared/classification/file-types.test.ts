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

  it('handles corrupted and malformed MIME types gracefully', () => {
    // Completely invalid MIME types
    expect(detectFileType({ mime: 'not-a-mime-type' })).toBe('data');
    expect(detectFileType({ mime: 'invalid/too/many/slashes' })).toBe('data');
    expect(detectFileType({ mime: '/missing-type' })).toBe('data');
    expect(detectFileType({ mime: 'missing-subtype/' })).toBe('data');

    // Malformed but potentially parseable MIME types
    expect(detectFileType({ mime: 'IMAGE/PNG' })).toBe('image'); // uppercase
    expect(detectFileType({ mime: '  image/jpeg  ' })).toBe('image'); // whitespace
    expect(
      detectFileType({ mime: 'text/plain; charset=utf-8; boundary=something' }),
    ).toBe('data');

    // Empty and null-like values
    expect(detectFileType({ mime: '' })).toBe('data');
    expect(detectFileType({ mime: '   ' })).toBe('data');
    expect(detectFileType({ mime: undefined })).toBe('data');
  });

  it('handles unusual and complex multi-part extensions', () => {
    // Deep multi-part extensions - these don't match because tar.gz is in the middle
    expect(detectFileType({ extension: 'backup.tar.gz.old' })).toBe('data');
    expect(detectFileType({ extension: 'file.tar.bz2.backup' })).toBe('data');
    expect(detectFileType({ extension: 'archive.tar.xz.encrypted' })).toBe(
      'data',
    );

    // Case sensitivity in multi-part extensions
    expect(detectFileType({ extension: 'FILE.TAR.GZ' })).toBe('archive');
    expect(detectFileType({ extension: 'Archive.Tar.Bz2' })).toBe('archive');

    // Unusual but valid extensions
    expect(detectFileType({ extension: '.tar.gz' })).toBe('archive'); // leading dot
    expect(detectFileType({ extension: '...tar.gz' })).toBe('archive'); // multiple leading dots
    expect(detectFileType({ extension: 'tar.sz' })).toBe('archive'); // less common compression
    expect(detectFileType({ extension: 'tar.br' })).toBe('archive'); // brotli compression
  });

  it('handles edge cases with extension formatting', () => {
    // Extensions with unusual formatting
    expect(detectFileType({ extension: '.PDF' })).toBe('pdf'); // uppercase with dot
    expect(detectFileType({ extension: 'PDF' })).toBe('pdf'); // uppercase without dot
    expect(detectFileType({ extension: '....pdf' })).toBe('pdf'); // multiple leading dots
    expect(detectFileType({ extension: 'pdf...' })).toBe('data'); // trailing dots not handled
    expect(detectFileType({ extension: '  .pdf  ' })).toBe('pdf'); // whitespace

    // Empty and invalid extensions
    expect(detectFileType({ extension: '' })).toBe('data');
    expect(detectFileType({ extension: '.' })).toBe('data');
    expect(detectFileType({ extension: '...' })).toBe('data');
    expect(detectFileType({ extension: '   ' })).toBe('data');
  });

  it('handles priority resolution with conflicting signals', () => {
    // MIME should win over extension
    expect(
      detectFileType({
        mime: 'application/pdf',
        extension: 'jpg',
      }),
    ).toBe('pdf');

    // MIME prefix matching should work
    expect(
      detectFileType({
        mime: 'image/webp',
        extension: 'pdf',
      }),
    ).toBe('image');

    // Extension fallback when MIME is invalid
    expect(
      detectFileType({
        mime: 'invalid/mime-type',
        extension: 'mp4',
      }),
    ).toBe('video');

    // Both invalid should default to data
    expect(
      detectFileType({
        mime: 'invalid/mime',
        extension: 'unknownext',
      }),
    ).toBe('data');
  });

  it('handles performance stress cases', () => {
    // Very long extension chains
    const longExtension = `file.${'part.'.repeat(20)}tar.gz`;
    expect(detectFileType({ extension: longExtension })).toBe('archive');

    // MIME types with many parameters
    const complexMime =
      'video/mp4; codecs="avc1.640028,mp4a.40.2"; profile=high; level=4.0';
    expect(detectFileType({ mime: complexMime })).toBe('video');

    // Very long MIME type
    const longMime = `application/${'x-very-long-subtype-'.repeat(10)}format`;
    expect(detectFileType({ mime: longMime })).toBe('data');
  });
});
