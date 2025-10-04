import { describe, expect, it } from 'vitest';
import type { MediaMetadataSummary } from '@/entrypoints/shared/integrations/mediainfo/media-summary';
import {
  applyFilenamePolicy,
  generateMediaEnhancedFilename,
} from './policy-engine';

describe('applyFilenamePolicy', () => {
  describe('basic functionality', () => {
    it('formats using clean separator and preserves casing', () => {
      const result = applyFilenamePolicy({
        subject: 'Quarterly performance update',
        qualifiers: ['2024-05-01', 'Example'],
        extension: 'PDF',
        maxLength: 60,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename).toBe(
        'Quarterly Performance Update 2024-05-01 Example.pdf',
      );
    });

    it('applies kebab separator with lowercase output', () => {
      const result = applyFilenamePolicy({
        subject: 'Product Roadmap',
        qualifiers: ['Phase 1', '2024'],
        extension: 'pdf',
        maxLength: 60,
        separator: 'kebab',
        transliterateAscii: false,
      });

      expect(result.filename).toBe('product-roadmap-phase-1-2024.pdf');
    });

    it('applies snake_case separator with lowercase output', () => {
      const result = applyFilenamePolicy({
        subject: 'User Research Report',
        qualifiers: ['Q3', '2024'],
        extension: 'docx',
        maxLength: 60,
        separator: 'snake',
        transliterateAscii: false,
      });

      expect(result.filename).toBe('user_research_report_q3_2024.docx');
    });
  });

  describe('length constraints', () => {
    it('respects max length by trimming tokens', () => {
      const result = applyFilenamePolicy({
        subject: 'A very long descriptive subject for an oversized document',
        qualifiers: ['2024-05-01'],
        extension: 'pdf',
        maxLength: 32,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename.length).toBeLessThanOrEqual(32);
      expect(result.filename.endsWith('.pdf')).toBe(true);
    });

    it('handles extremely short length limits gracefully', () => {
      const result = applyFilenamePolicy({
        subject: 'Document',
        qualifiers: ['2024'],
        extension: 'pdf',
        maxLength: 15,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename.length).toBeLessThanOrEqual(15);
      expect(result.filename).toBe('Document.pdf');
    });

    it('preserves at least one character of subject when very constrained', () => {
      const result = applyFilenamePolicy({
        subject: 'VeryLongSubjectThatExceedsLimit',
        qualifiers: [],
        extension: 'pdf',
        maxLength: 10,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename.length).toBeLessThanOrEqual(10);
      expect(result.filename.endsWith('.pdf')).toBe(true);
      expect(result.base.length).toBeGreaterThan(0);
    });

    it('falls back to "file" when subject is empty', () => {
      const result = applyFilenamePolicy({
        subject: '',
        qualifiers: [],
        extension: 'txt',
        maxLength: 60,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename).toBe('file.txt');
    });
  });

  describe('character handling', () => {
    it('optionally transliterates diacritics', () => {
      const result = applyFilenamePolicy({
        subject: 'Zażółć gęślą jaźń',
        qualifiers: ['Łódź'],
        extension: 'txt',
        maxLength: 60,
        separator: 'clean',
        transliterateAscii: true,
      });

      expect(result.filename).toBe('Zazolc Gesla Jazn Lodz.txt');
    });

    it('preserves diacritics when transliteration is disabled', () => {
      const result = applyFilenamePolicy({
        subject: 'Café résumé',
        qualifiers: ['François'],
        extension: 'pdf',
        maxLength: 60,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename).toBe('Café Résumé François.pdf');
    });

    it('handles unsafe filename characters by normalizing them', () => {
      const result = applyFilenamePolicy({
        subject: 'File with: unsafe* chars?',
        qualifiers: ['<test>'],
        extension: 'txt',
        maxLength: 60,
        separator: 'clean',
        transliterateAscii: false,
      });

      // Should normalize unsafe characters to spaces and clean up
      expect(result.filename).toBe('File With Unsafe Chars Test.txt');
    });

    it('preserves acronyms in uppercase when appropriate', () => {
      const result = applyFilenamePolicy({
        subject: 'HTML CSS API reference',
        qualifiers: ['v2'],
        extension: 'pdf',
        maxLength: 60,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename).toBe('HTML CSS API Reference V2.pdf');
    });
  });

  describe('date handling', () => {
    it('reconstructs date patterns from separated tokens', () => {
      const result = applyFilenamePolicy({
        subject: 'Invoice report',
        qualifiers: ['2024', '03', '15'],
        extension: 'pdf',
        maxLength: 60,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename).toBe('Invoice Report 2024-03-15.pdf');
    });

    it('does not reconstruct incomplete date patterns', () => {
      const result = applyFilenamePolicy({
        subject: 'Report',
        qualifiers: ['2024', '03'],
        extension: 'pdf',
        maxLength: 60,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename).toBe('Report 2024 03.pdf');
    });
  });

  describe('deduplication', () => {
    it('removes duplicate tokens case-insensitively', () => {
      const result = applyFilenamePolicy({
        subject: 'Report summary',
        qualifiers: ['report', 'Summary', 'data'],
        extension: 'pdf',
        maxLength: 60,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename).toBe('Report Summary Data.pdf');
    });
  });

  describe('extension handling', () => {
    it('handles missing extension gracefully', () => {
      const result = applyFilenamePolicy({
        subject: 'Document',
        qualifiers: [],
        extension: null,
        maxLength: 60,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename).toBe('Document');
      expect(result.extension).toBeNull();
    });

    it('normalizes extension to lowercase', () => {
      const result = applyFilenamePolicy({
        subject: 'Document',
        qualifiers: [],
        extension: 'PDF',
        maxLength: 60,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename).toBe('Document.pdf');
      expect(result.extension).toBe('pdf');
    });

    it('removes leading dots from extension', () => {
      const result = applyFilenamePolicy({
        subject: 'Document',
        qualifiers: [],
        extension: '..pdf',
        maxLength: 60,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename).toBe('Document.pdf');
      expect(result.extension).toBe('pdf');
    });
  });

  describe('real-world examples from PRD', () => {
    it('formats Polish residence permit document', () => {
      const result = applyFilenamePolicy({
        subject: 'Wniosek o przedłużenie zezwolenia na pobyt',
        qualifiers: ['2025-09-15'],
        extension: 'pdf',
        maxLength: 80,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename).toBe(
        'Wniosek O Przedłużenie Zezwolenia Na Pobyt 2025-09-15.pdf',
      );
    });

    it('formats invoice with amount', () => {
      const result = applyFilenamePolicy({
        subject: 'Biedronka Faktura',
        qualifiers: ['2025-03-04', '146,20 PLN'],
        extension: 'pdf',
        maxLength: 80,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename).toBe(
        'Biedronka Faktura 2025-03-04 146,20 PLN.pdf',
      );
    });

    it('formats screenshot description', () => {
      const result = applyFilenamePolicy({
        subject: 'Figma Navbar fix dialog',
        qualifiers: [],
        extension: 'png',
        maxLength: 60,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename).toBe('Figma Navbar Fix Dialog.png');
    });

    it('formats meeting audio with duration', () => {
      const result = applyFilenamePolicy({
        subject: 'Waypass Sprint planning Q4 goals',
        qualifiers: ['45m'],
        extension: 'mp3',
        maxLength: 80,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename).toBe('Waypass Sprint Planning Q4 Goals 45m.mp3');
    });

    it('formats video tutorial with specs', () => {
      const result = applyFilenamePolicy({
        subject: 'Supabase CORS dla Edge Functions',
        qualifiers: ['1080p', '12m'],
        extension: 'mp4',
        maxLength: 80,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename).toBe(
        'Supabase CORS Dla Edge Functions 1080p 12m.mp4',
      );
    });

    it('formats photo with location and date', () => {
      const result = applyFilenamePolicy({
        subject: 'Zachód słońca Tatry Morskie Oko',
        qualifiers: ['2025-08-17'],
        extension: 'jpg',
        maxLength: 80,
        separator: 'clean',
        transliterateAscii: false,
      });

      expect(result.filename).toBe(
        'Zachód Słońca Tatry Morskie Oko 2025-08-17.jpg',
      );
    });
  });
});

describe('generateMediaEnhancedFilename', () => {
  const baseSummary: MediaMetadataSummary = {
    general: {
      durationMs: 28_237,
      format: 'AVI',
      overallBitRateKbps: 2_807,
      fileSizeBytes: 9_909_100,
      title: undefined,
    },
    video: [
      {
        codec: 'MPEG-4 Visual / FMP4',
        codecProfile: 'Simple',
        width: 1_920,
        height: 1_080,
        frameRate: 23.976,
        displayAspectRatio: 1.778,
        hdrFormat: undefined,
        bitRateKbps: 2_801,
      },
    ],
    audio: [],
  };

  const defaultSettings = {
    maxLength: 80,
    separator: 'clean' as const,
    transliterateAscii: false,
  };

  it('builds enhanced filename without container format', () => {
    const result = generateMediaEnhancedFilename(
      'Sample 1920x1080.avi',
      baseSummary,
      'video',
      defaultSettings,
    );

    expect(result.filename).toBe('Sample 1920x1080 1080p 24fps 28s.avi');
  });

  it('preserves original underscore delimiter when settings use clean separator', () => {
    const result = generateMediaEnhancedFilename(
      'Sample_clip.avi',
      baseSummary,
      'video',
      defaultSettings,
    );

    expect(result.filename).toBe('Sample_Clip_1080p_24fps_28s.avi');
  });

  it('preserves original hyphen delimiter when settings use clean separator', () => {
    const result = generateMediaEnhancedFilename(
      'Sample-clip.avi',
      baseSummary,
      'video',
      defaultSettings,
    );

    expect(result.filename).toBe('Sample-Clip-1080p-24fps-28s.avi');
  });
});
