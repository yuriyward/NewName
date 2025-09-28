import { describe, expect, it } from 'vitest';
import type { SettingsV1 } from '@/entrypoints/shared/settings/settings';
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
        '2025-01-01',
        'txt', // extension takes 4 chars (.txt)
        '',
        'original.txt',
        'data',
        { maxLen: 3 } as SettingsV1, // Only 3 chars total - less than extension
      );

      // Should return the date with extension when no room for base
      expect(result.filename).toBe('2025-01-01.txt');
    });

    it('handles max length exactly equal to extension length', () => {
      const result = buildOriginalWithDateRename(
        'document',
        'fallback',
        '_',
        '2025-01-01',
        'txt',
        '',
        'original.txt',
        'data',
        { maxLen: 4 } as SettingsV1, // Exactly .txt length
      );

      // Should return the date with extension when no room for base
      expect(result.filename).toBe('2025-01-01.txt');
    });

    it('handles very long extension that exceeds maxLen', () => {
      const result = buildOriginalWithDateRename(
        'document',
        'fallback',
        '_',
        '2025-01-01',
        'verylongextension', // 17 chars + 1 for dot = 18 chars
        '',
        'original.verylongextension',
        'data',
        { maxLen: 10 } as SettingsV1, // Much shorter than extension
      );

      // Should return the date with extension
      expect(result.filename).toBe('2025-01-01.verylongextension');
    });

    it('handles empty base with fallback', () => {
      const result = buildOriginalWithDateRename(
        '', // empty raw base
        'fallback-name',
        '_',
        '2025-01-01',
        'txt',
        '',
        'original.txt',
        'data',
        { maxLen: 30 } as SettingsV1,
      );

      expect(result.filename).toBe('fallback-name_2025-01-01.txt');
    });

    it('handles both empty raw and fallback base', () => {
      const result = buildOriginalWithDateRename(
        '',
        '',
        '_',
        '2025-01-01',
        'txt',
        '',
        'original.txt',
        'data',
        { maxLen: 30 } as SettingsV1,
      );

      expect(result.filename).toBe('file_2025-01-01.txt');
    });

    it('handles no extension', () => {
      const result = buildOriginalWithDateRename(
        'document',
        'fallback',
        '_',
        '2025-01-01',
        null, // no extension
        '',
        'original',
        'data',
        { maxLen: 30 } as SettingsV1,
      );

      expect(result.filename).toBe('document_2025-01-01');
      expect(result.filename.length).toBeLessThanOrEqual(30);
    });

    it('handles very long base name that needs truncation', () => {
      const result = buildOriginalWithDateRename(
        'this-is-a-very-long-document-name-that-should-be-truncated',
        'fallback',
        '_',
        '2025-01-01',
        'txt',
        '',
        'original.txt',
        'data',
        { maxLen: 25 } as SettingsV1,
      );

      expect(result.filename).toMatch(/\.txt$/);
      expect(result.filename.length).toBeLessThanOrEqual(25);
      expect(result.filename).toContain('2025-01-01');
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
        } as SettingsV1,
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
        } as SettingsV1,
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
        } as SettingsV1,
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
        } as SettingsV1,
        ['test'],
      );

      expect(result.filename).not.toContain('.');
      expect(result.filename).toContain('Document');
    });
  });
});
