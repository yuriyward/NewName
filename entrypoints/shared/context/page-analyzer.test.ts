import { describe, expect, it } from 'vitest';
import {
  deriveDomainBrand,
  extractExtension,
  extractFileName,
  extractResolutionFromFilename,
  safeDecode,
} from './page-analyzer';

describe('page-analyzer utilities', () => {
  describe('safeDecode', () => {
    it('decodes valid URI components and falls back on failure', () => {
      expect(safeDecode('Report%20Q4%202024')).toBe('Report Q4 2024');
      expect(safeDecode('%')).toBe('%');
    });
  });

  describe('extractFileName', () => {
    it('returns the trailing segment from URLs and file paths', () => {
      expect(extractFileName('https://example.com/files/report.pdf')).toBe(
        'report.pdf',
      );
      expect(extractFileName('C:/Users/me/Pictures/screenshot.png')).toBe(
        'screenshot.png',
      );
      expect(extractFileName('C\\Users\\me\\Pictures\\image.jpg')).toBe(
        'image.jpg',
      );
    });
  });

  describe('extractExtension', () => {
    it('returns the last extension token when present', () => {
      expect(extractExtension('report.pdf')).toBe('pdf');
      expect(extractExtension('archive.tar.gz')).toBe('gz');
      expect(extractExtension('document')).toBeNull();
    });
  });

  describe('deriveDomainBrand', () => {
    it('extracts brand-like domain fragments', () => {
      expect(deriveDomainBrand(new URL('https://example.com/download'))).toBe(
        'example',
      );
      expect(
        deriveDomainBrand(new URL('https://www.docs.example.co.uk/files')),
      ).toBe('example');
      expect(deriveDomainBrand(new URL('https://m.example.com/download'))).toBe(
        'example',
      );
      expect(deriveDomainBrand(new URL('https://app.notion.so/page'))).toBe(
        'notion',
      );
      expect(deriveDomainBrand(new URL('https://localhost/resource'))).toBe(
        'localhost',
      );
    });
  });

  describe('extractResolutionFromFilename', () => {
    it('detects resolution fragments regardless of separator', () => {
      expect(
        extractResolutionFromFilename('Screenshot 2024-01-01 1920x1080.png'),
      ).toBe('1920x1080');
      expect(extractResolutionFromFilename('image_800×600.jpg')).toBe(
        '800x600',
      );
      expect(extractResolutionFromFilename('photo.png')).toBeNull();
    });
  });
});
