import { describe, expect, it } from 'vitest';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import {
  buildOriginalWithDateRename,
  buildRenameProposal,
} from './filename-composer';

describe('filename-composer', () => {
  describe('buildOriginalWithDateRename', () => {
    it('handles extremely short max length (edge case for logic fix)', () => {
      const result = buildOriginalWithDateRename(
        'document',
        'fallback',
        '_',
        '2025-01-01_08-30',
        'txt', // extension takes 4 chars (.txt)
        '',
        'original.txt',
        'data',
        { maxLen: 3, separator: 'clean' } as Settings, // Only 3 chars total - less than extension
      );

      // Should return just the datetime with extension when no room for base
      expect(result.filename).toBe('2025-01-01_08-30.txt');
    });

    it('handles max length exactly equal to extension length', () => {
      const result = buildOriginalWithDateRename(
        'document',
        'fallback',
        '_',
        '2025-01-01_08-30',
        'txt',
        '',
        'original.txt',
        'data',
        { maxLen: 4, separator: 'clean' } as Settings, // Exactly .txt length
      );

      // Should return just the datetime with extension when no room for base
      expect(result.filename).toBe('2025-01-01_08-30.txt');
    });

    it('handles very long extension that exceeds maxLen', () => {
      const result = buildOriginalWithDateRename(
        'document',
        'fallback',
        '_',
        '2025-01-01_08-30',
        'verylongextension', // 17 chars + 1 for dot = 18 chars
        '',
        'original.verylongextension',
        'data',
        { maxLen: 10, separator: 'clean' } as Settings, // Much shorter than extension
      );

      // Should return just the datetime with extension
      expect(result.filename).toBe('2025-01-01_08-30.verylongextension');
    });

    it('handles empty base with fallback', () => {
      const result = buildOriginalWithDateRename(
        '', // empty raw base
        'fallback-name',
        '_',
        '2025-01-01_08-30',
        'txt',
        '',
        'original.txt',
        'data',
        { maxLen: 50, separator: 'clean' } as Settings,
      );

      expect(result.filename).toBe('2025-01-01_08-30 fallback-name.txt');
    });

    it('handles both empty raw and fallback base', () => {
      const result = buildOriginalWithDateRename(
        '',
        '',
        '_',
        '2025-01-01_08-30',
        'txt',
        '',
        'original.txt',
        'data',
        { maxLen: 50, separator: 'clean' } as Settings,
      );

      expect(result.filename).toBe('2025-01-01_08-30 file.txt');
    });

    it('handles no extension', () => {
      const result = buildOriginalWithDateRename(
        'document',
        'fallback',
        '_',
        '2025-01-01_08-30',
        null, // no extension
        '',
        'original',
        'data',
        { maxLen: 50, separator: 'clean' } as Settings,
      );

      expect(result.filename).toBe('2025-01-01_08-30 document');
      expect(result.filename.length).toBeLessThanOrEqual(50);
    });

    it('handles very long base name that needs truncation', () => {
      const result = buildOriginalWithDateRename(
        'this-is-a-very-long-document-name-that-should-be-truncated',
        'fallback',
        '_',
        '2025-01-01_08-30',
        'txt',
        '',
        'original.txt',
        'data',
        { maxLen: 30, separator: 'clean' } as Settings,
      );

      expect(result.filename).toMatch(/\.txt$/);
      expect(result.filename.length).toBeLessThanOrEqual(30);
      expect(result.filename).toContain('2025-01-01_08-30');
    });
  });

  describe('buildRenameProposal', () => {
    it('handles empty subject', () => {
      const result = buildRenameProposal(
        '', // empty subject
        ['qualifier'],
        'txt',
        '',
        'original.txt',
        'data',
        {
          maxLen: 30,
          separator: 'clean',
          transliterateAscii: false,
        } as Settings,
        ['test'],
      );

      // Should handle empty subject gracefully
      expect(result.filename).toMatch(/\.txt$/);
      expect(result.reasonTags).toEqual(['test']);
    });

    it('handles very long qualifiers', () => {
      const result = buildRenameProposal(
        'document',
        ['very-long-qualifier-that-might-exceed-limits', 'another-long-one'],
        'txt',
        '',
        'original.txt',
        'data',
        {
          maxLen: 20,
          separator: 'clean',
          transliterateAscii: false,
        } as Settings,
        ['test'],
      );

      expect(result.filename.length).toBeLessThanOrEqual(20);
      expect(result.filename).toMatch(/\.txt$/);
    });

    it('handles no qualifiers', () => {
      const result = buildRenameProposal(
        'document',
        [], // no qualifiers
        'txt',
        'folder',
        'folder/original.txt',
        'data',
        {
          maxLen: 30,
          separator: 'clean',
          transliterateAscii: false,
        } as Settings,
        ['test'],
      );

      expect(result.filename).toBe('Document.txt');
      expect(result.path).toBe('folder/Document.txt');
    });

    it('handles null extension', () => {
      const result = buildRenameProposal(
        'document',
        ['qualifier'],
        null, // no extension
        '',
        'original',
        'data',
        {
          maxLen: 30,
          separator: 'clean',
          transliterateAscii: false,
        } as Settings,
        ['test'],
      );

      expect(result.filename).not.toContain('.');
      expect(result.filename).toContain('Document');
    });
  });
});
