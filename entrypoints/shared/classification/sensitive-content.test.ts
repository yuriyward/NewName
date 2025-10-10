import { describe, expect, it } from 'vitest';
import {
  detectSensitiveContent,
  type SensitiveDetectionResult,
} from './sensitive-content';

function collectMatches(result: SensitiveDetectionResult) {
  return result.matches.map((match) => ({
    category: match.category,
    source: match.source,
  }));
}

describe('detectSensitiveContent', () => {
  it('detects sensitive patterns across original and proposed filenames', () => {
    const result = detectSensitiveContent({
      originalPath: '/tmp/passport-scan.pdf',
      proposedPath: '/tmp/2025-10-10-passport.pdf',
    });

    expect(result.reasons).toEqual(['personal-identity']);
    expect(collectMatches(result)).toEqual([
      { category: 'personal-identity', source: 'proposed-filename' },
      { category: 'personal-identity', source: 'original-filename' },
    ]);
  });

  it('includes url matches in the detection results', () => {
    const result = detectSensitiveContent({
      originalPath: '/downloads/report.csv',
      url: 'https://example.com/banking/statements/october',
    });

    expect(result.reasons).toEqual(['financial-document']);
    expect(result.matches).toEqual([
      {
        category: 'financial-document',
        pattern: '\\/(banking|account|statements?)\\/',
        source: 'url',
      },
    ]);
  });

  it('maps reason tags to sensitive categories without duplicates', () => {
    const result = detectSensitiveContent({
      originalPath: '/tmp/legal-contract.docx',
      reasonTags: ['Legal', 'Financial'],
    });

    expect(result.reasons.sort()).toEqual([
      'financial-document',
      'legal-document',
    ]);
    expect(result.matches).toEqual([
      {
        category: 'legal-document',
        pattern:
          '\\b(contract|petition|lawsuit|subpoena|nda|agreement|affidavit)\\b',
        source: 'original-filename',
      },
      {
        category: 'legal-document',
        pattern: 'Legal',
        source: 'reason-tag',
      },
      {
        category: 'financial-document',
        pattern: 'Financial',
        source: 'reason-tag',
      },
    ]);
  });
});
