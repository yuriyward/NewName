import { describe, expect, it } from 'vitest';
import {
  splitPath,
  stripExtension,
  sanitizeBaseName,
  detectOriginalDelimiter,
  sanitizeLiteralSegment
} from './path-utils';

describe('path-utils', () => {
  describe('stripExtension', () => {
    it('handles extensions longer than 8 characters (regression test for regex fix)', () => {
      const result = stripExtension('document.verylongextension');
      expect(result.base).toBe('document');
      expect(result.extension).toBe('verylongextension');
    });

    it('handles extensions up to 20 characters', () => {
      const result = stripExtension('file.abcdefghijklmnopqrst'); // 20 chars
      expect(result.base).toBe('file');
      expect(result.extension).toBe('abcdefghijklmnopqrst');
    });

    it('handles single character extensions', () => {
      const result = stripExtension('file.c');
      expect(result.base).toBe('file');
      expect(result.extension).toBe('c');
    });

    it('handles multi-part archive extensions first (priority test)', () => {
      const result = stripExtension('archive.tar.gz');
      expect(result.base).toBe('archive');
      expect(result.extension).toBe('tar.gz');
    });

    it('handles files with no extension', () => {
      const result = stripExtension('README');
      expect(result.base).toBe('README');
      expect(result.extension).toBe(null);
    });

    it('handles files with multiple dots but no valid extension', () => {
      const result = stripExtension('file.with.many.dots');
      expect(result.base).toBe('file.with.many');
      expect(result.extension).toBe('dots');
    });

    it('handles files ending with dots', () => {
      const result = stripExtension('file...');
      expect(result.base).toBe('file');
      expect(result.extension).toBe(null);
    });

    it('handles very long multi-part extensions', () => {
      const result = stripExtension('backup.tar.bz2');
      expect(result.base).toBe('backup');
      expect(result.extension).toBe('tar.bz2');
    });

    it('handles edge case: filename is just extension', () => {
      const result = stripExtension('.gitignore');
      expect(result.base).toBe('');
      expect(result.extension).toBe('gitignore');
    });

    it('handles numeric extensions', () => {
      const result = stripExtension('file.123');
      expect(result.base).toBe('file');
      expect(result.extension).toBe('123');
    });

    it('handles mixed alphanumeric extensions', () => {
      const result = stripExtension('file.abc123');
      expect(result.base).toBe('file');
      expect(result.extension).toBe('abc123');
    });

    it('rejects extensions with special characters (fallback to no extension)', () => {
      // This tests the alphanumeric-only regex constraint
      const result = stripExtension('file.ext-with-dash');
      expect(result.base).toBe('file.ext-with-dash');
      expect(result.extension).toBe(null);
    });
  });

  describe('splitPath', () => {
    it('handles paths with multiple directories', () => {
      const result = splitPath('folder/subfolder/file.txt');
      expect(result.directory).toBe('folder/subfolder');
      expect(result.name).toBe('file.txt');
    });

    it('handles file in root (no directory)', () => {
      const result = splitPath('file.txt');
      expect(result.directory).toBe('');
      expect(result.name).toBe('file.txt');
    });

    it('handles Windows-style paths', () => {
      const result = splitPath('C:\\Users\\Name\\file.txt');
      expect(result.directory).toBe('C:/Users/Name');
      expect(result.name).toBe('file.txt');
    });

    it('handles empty path', () => {
      const result = splitPath('');
      expect(result.directory).toBe('');
      expect(result.name).toBe('');
    });
  });

  describe('sanitizeBaseName', () => {
    it('replaces underscores with spaces', () => {
      const result = sanitizeBaseName('file_name_with_underscores');
      expect(result).toBe('file name with underscores');
    });

    it('handles multiple consecutive underscores', () => {
      const result = sanitizeBaseName('file___name');
      expect(result).toBe('file name');
    });

    it('trims whitespace', () => {
      const result = sanitizeBaseName('  file_name  ');
      expect(result).toBe('file name');
    });

    it('handles empty string', () => {
      const result = sanitizeBaseName('');
      expect(result).toBe('');
    });
  });

  describe('detectOriginalDelimiter', () => {
    it('prefers most frequent delimiter', () => {
      const result = detectOriginalDelimiter('file-name-with-many-dashes_and_one_underscore');
      expect(result).toBe('-');
    });

    it('prefers earlier delimiter when counts are equal', () => {
      const result = detectOriginalDelimiter('file-name_with_equal.counts');
      expect(result).toBe('_'); // underscore appears more frequently
    });

    it('returns space as fallback when no delimiters found', () => {
      const result = detectOriginalDelimiter('filename');
      expect(result).toBe(' ');
    });

    it('handles empty string', () => {
      const result = detectOriginalDelimiter('');
      expect(result).toBe(' ');
    });

    it('handles only delimiters', () => {
      const result = detectOriginalDelimiter('---');
      expect(result).toBe('-');
    });
  });

  describe('sanitizeLiteralSegment', () => {
    it('replaces forbidden filename characters with spaces', () => {
      const result = sanitizeLiteralSegment('file<name>with|forbidden?chars');
      expect(result).toBe('file name with forbidden chars');
    });

    it('normalizes different types of whitespace', () => {
      const result = sanitizeLiteralSegment('file\tname\nwith\rwhitespace');
      expect(result).toBe('file name with whitespace');
    });

    it('strips control characters', () => {
      const result = sanitizeLiteralSegment('file\x00name\x1fwith\x7fcontrol');
      expect(result).toBe('filenamewithcontrol');
    });

    it('handles empty string', () => {
      const result = sanitizeLiteralSegment('');
      expect(result).toBe('');
    });

    it('handles null input', () => {
      const result = sanitizeLiteralSegment(null as any);
      expect(result).toBe('');
    });

    it('handles unicode characters properly', () => {
      const result = sanitizeLiteralSegment('file 📄 name');
      expect(result).toBe('file 📄 name');
    });
  });
});