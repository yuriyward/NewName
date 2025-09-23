import { describe, expect, it } from 'vitest';
import {
  computeGenericPenalty,
  looksLikeHash,
  normaliseCandidate,
  pickBestSegment,
  shouldKeepToken,
  trimLinkTokens,
} from './content-filtering';

describe('content-filtering utilities', () => {
  describe('looksLikeHash', () => {
    it('detects various hash-like patterns', () => {
      expect(looksLikeHash('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(looksLikeHash('af3e9eac7c9b0f23')).toBe(true);
      expect(looksLikeHash('QWxhZGRpbjpvcGVuIHNlc2FtZQ==')).toBe(true);
      expect(looksLikeHash('report')).toBe(false);
    });
  });

  describe('pickBestSegment', () => {
    it('prefers the longest segment that does not include the brand', () => {
      const result = pickBestSegment(
        'Invoice 123 | Company Portal | Example Corp',
        'example',
      );
      expect(result).toBe('Invoice 123');
    });

    it('falls back to the longest segment when brand filtering removes all', () => {
      const result = pickBestSegment('Example | Example Docs', 'example');
      expect(result).toBe('Example Docs');
    });
  });

  describe('shouldKeepToken', () => {
    it('filters stopwords and numeric noise based on context', () => {
      expect(shouldKeepToken('Attachment', 'Title', null)).toBe(false);
      expect(shouldKeepToken('download', 'Link', null)).toBe(false);
      expect(shouldKeepToken('123456789', 'Title', null)).toBe(false);
      expect(shouldKeepToken('-', 'Title', null)).toBe(true);
      expect(shouldKeepToken('Summary', 'Title', null)).toBe(true);
    });
  });

  describe('trimLinkTokens', () => {
    it('removes leading and trailing link noise tokens', () => {
      const result = trimLinkTokens([
        'Click',
        'here',
        'Invoice',
        'download',
        'copy',
      ]);
      expect(result).toEqual(['Invoice']);
    });
  });

  describe('computeGenericPenalty', () => {
    it('applies penalties for generic subjects', () => {
      expect(computeGenericPenalty('download portal', 'Title')).toBe(40);
      expect(computeGenericPenalty('portal update', 'Title')).toBe(20);
      expect(computeGenericPenalty('Quarterly financial report', 'Title')).toBe(
        0,
      );
      expect(computeGenericPenalty('download portal', 'Filename')).toBe(0);
    });
  });

  describe('normaliseCandidate', () => {
    it('cleans up raw text, removes extensions, and collapses whitespace', () => {
      const result = normaliseCandidate(
        'Quarterly_Report_Final (1).PDF',
        null,
        'Filename',
      );
      expect(result).toBe('Quarterly Report 1');
    });

    it('removes brand segments and link stopwords for link candidates', () => {
      const result = normaliseCandidate(
        'Click here to download Invoice 123 copy',
        'example',
        'Link',
      );
      expect(result).toBe('Invoice 123');
    });

    it('returns null when everything is filtered out', () => {
      const result = normaliseCandidate(
        'Click here to download',
        'example',
        'Link',
      );
      expect(result).toBeNull();
    });
  });
});
