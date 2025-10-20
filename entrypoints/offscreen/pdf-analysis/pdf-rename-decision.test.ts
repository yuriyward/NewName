/**
 * Tests for pdf-rename-decision.ts heuristic functions
 * Tests the pure functions that detect hash/UUID, timestamp-only, and generic names
 */

import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { decidePdfRename } from './pdf-rename-decision';
import type { PdfTitleDescriptionContext } from './pdf-title-description';

let mockConsoleLog: ReturnType<typeof vi.spyOn> | undefined;

/**
 * Helper to create mock context
 */
function createMockContext(
  overrides: Partial<PdfTitleDescriptionContext> = {},
): PdfTitleDescriptionContext {
  return {
    documentTitle: null,
    pageAnalyses: [],
    mergedDescription: '',
    confidence: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockConsoleLog?.mockRestore();
  mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  mockConsoleLog?.mockRestore();
});

describe('decidePdfRename - Title-based decisions', () => {
  it('returns shouldRename=true with high confidence when clear title found', async () => {
    const context = createMockContext({
      documentTitle: 'Annual Budget Report 2024',
      pageAnalyses: [],
    });
    const result = await decidePdfRename(context, 'document.pdf');

    expect(result.shouldRename).toBe(true);
    expect(result.confidence).toBe(0.95);
    expect(result.reason).toBe('pdf-title-descriptive');
    expect(result.explanation).toContain('Annual Budget Report 2024');
  });

  it('returns shouldRename=true for shorter but valid titles', async () => {
    const context = createMockContext({
      documentTitle: 'Meeting',
      pageAnalyses: [],
    });
    const result = await decidePdfRename(context, 'file.pdf');

    expect(result.shouldRename).toBe(true);
    expect(result.confidence).toBe(0.95);
    // "Meeting" is 7 chars, which is > 5, so it's considered descriptive
    expect(result.reason).toBe('pdf-title-descriptive');
  });

  it('ignores empty/whitespace-only titles and uses baseline heuristics', async () => {
    const context = createMockContext({
      documentTitle: '   ',
      pageAnalyses: [],
    });
    const result = await decidePdfRename(context, 'document.pdf');

    // Whitespace-only titles are treated as no title, so we fall back to baseline
    // "document" is detected as generic, so shouldRename=true
    expect(result.shouldRename).toBe(true);
    expect(result.reason).toBe('baseline-generic');
  });

  it('treats undefined title same as missing', async () => {
    const context = createMockContext({
      documentTitle: undefined,
      pageAnalyses: [],
    });
    const result = await decidePdfRename(context, 'document.pdf');

    // undefined title falls back to baseline heuristics
    // "document" is detected as generic, so shouldRename=true
    expect(result.shouldRename).toBe(true);
    expect(result.reason).toBe('baseline-generic');
  });
});

describe('decidePdfRename - Hash/UUID detection', () => {
  describe('isHashOrUUID - Standard UUID formats', () => {
    it('detects standard UUID format', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '550e8400-e29b-41d4-a716-446655440000.pdf',
      );

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-hash');
      expect(result.confidence).toBe(0.9);
    });

    it('detects UUID with uppercase letters', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '550E8400-E29B-41D4-A716-446655440000.pdf',
      );

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-hash');
    });

    it('detects UUID with mixed case', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '550e8400-E29B-41d4-A716-446655440000.pdf',
      );

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-hash');
    });
  });

  describe('isHashOrUUID - Long hex hashes (MD5, SHA1, SHA256)', () => {
    it('detects MD5 hash (32 hex chars)', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '5d41402abc4b2a76b9719d911017c592.pdf',
      );

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-hash');
    });

    it('detects SHA1 hash (40 hex chars)', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d.pdf',
      );

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-hash');
    });

    it('detects SHA256 hash (64 hex chars)', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '2c26b46911185131006cba356cb1015b02949844e38159c27f1853da91fa8f445.pdf',
      );

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-hash');
    });

    it('detects very long hex string (128+ chars)', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbb.pdf',
      );

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-hash');
    });
  });

  describe('isHashOrUUID - Excludes valid identifiers that look like hashes', () => {
    it('does NOT treat arXiv paper IDs as hashes (e.g., 2405.19261v2)', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '2405.19261v2.pdf',
      );

      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });

    it('does NOT treat other numeric.numeric patterns as hashes', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '2023.10.1234.pdf',
      );

      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });
  });

  describe('isHashOrUUID - Invalid and edge cases', () => {
    it('does not treat hex strings shorter than 32 chars as hashes', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        'abcdef1234567890.pdf',
      );

      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });

    it('does not treat malformed UUIDs as hashes', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '550e8400-e29b-41d4-a716-44665544000.pdf', // Missing one char
      );

      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });

    it('does not treat hex with non-hex characters as hashes', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '5d41402abc4b2a76b9719d911017c59z.pdf', // 'z' is not hex
      );

      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });
  });
});

describe('decidePdfRename - Timestamp detection', () => {
  describe('isTimestampOnly - ISO-like formats', () => {
    it('detects YYYY-MM-DD format', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '2024-10-20.pdf',
      );

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-timestamp');
      expect(result.confidence).toBe(0.85);
    });

    it('detects YYYY-MM-DD-HH format', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '2024-10-20-14.pdf',
      );

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-timestamp');
    });

    it('detects YYYY-MM-DD-HH-MM format', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '2024-10-20-14-30.pdf',
      );

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-timestamp');
    });

    it('detects YYYY-MM-DD-HH-MM-SS format', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '2024-10-20-14-30-45.pdf',
      );

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-timestamp');
    });
  });

  describe('isTimestampOnly - ISO 8601 format', () => {
    it('does NOT match YYYYMMTHHMMSS due to case sensitivity (T becomes lowercase)', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '20241020T143045.pdf',
      );

      // The filename is lowercased before pattern matching, so uppercase 'T' pattern won't match
      // "20241020t143045" doesn't match /^\d{8}T\d{6}/ (capital T required)
      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });

    it('does NOT detect partial YYYYMMTHHMM (requires full HHMMSS)', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '20241020T1430.pdf',
      );

      // Pattern requires 8 digits + T + 6 digits (HHMMSS), so this won't match
      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });
  });

  describe('isTimestampOnly - Underscore format', () => {
    it('detects YYYY_MM_DD format', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '2024_10_20.pdf',
      );

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-timestamp');
    });
  });

  describe('isTimestampOnly - Unix timestamp', () => {
    it('detects 10-digit Unix timestamp', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '1697809845.pdf',
      );

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-timestamp');
    });

    it('detects 13-digit millisecond timestamp', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '1697809845123.pdf',
      );

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-timestamp');
    });

    it('detects 16-digit microsecond timestamp', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '1697809845123456.pdf',
      );

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-timestamp');
    });
  });

  describe('isTimestampOnly - Invalid and edge cases', () => {
    it('does not treat partial dates as timestamps', async () => {
      const result = await decidePdfRename(createMockContext(), '2024-10.pdf');

      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });

    it('does not treat short digit sequences as timestamps', async () => {
      const result = await decidePdfRename(createMockContext(), '12345.pdf');

      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });

    it('does not treat 9-digit numbers as timestamps', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '123456789.pdf',
      );

      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });

    it('does not treat dates with extra text as timestamp-only', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        '2024-10-20-report.pdf',
      );

      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });
  });
});

describe('decidePdfRename - Generic name detection', () => {
  describe('isGenericName - Common generic single words', () => {
    it('detects "document" as generic', async () => {
      const result = await decidePdfRename(createMockContext(), 'document.pdf');

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-generic');
    });

    it('detects "file" as generic', async () => {
      const result = await decidePdfRename(createMockContext(), 'file.pdf');

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-generic');
    });

    it('detects "download" as generic', async () => {
      const result = await decidePdfRename(createMockContext(), 'download.pdf');

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-generic');
    });

    it('detects "unnamed" as generic', async () => {
      const result = await decidePdfRename(createMockContext(), 'unnamed.pdf');

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-generic');
    });

    it('detects "untitled" as generic', async () => {
      const result = await decidePdfRename(createMockContext(), 'untitled.pdf');

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-generic');
    });

    it('detects "new" as generic', async () => {
      const result = await decidePdfRename(createMockContext(), 'new.pdf');

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-generic');
    });

    it('detects "copy" as generic', async () => {
      const result = await decidePdfRename(createMockContext(), 'copy.pdf');

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-generic');
    });

    it('detects "archive" as generic', async () => {
      const result = await decidePdfRename(createMockContext(), 'archive.pdf');

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-generic');
    });
  });

  describe('isGenericName - Generic with separators', () => {
    it('detects "document-1" as generic', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        'document-1.pdf',
      );

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-generic');
    });

    it('detects "file-2024" as generic', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        'file-2024.pdf',
      );

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-generic');
    });

    it('detects "copy-of-copy" as generic', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        'copy-of-copy.pdf',
      );

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-generic');
    });
  });

  describe('isGenericName - Case insensitivity', () => {
    it('detects generic names in uppercase', async () => {
      const result = await decidePdfRename(createMockContext(), 'DOCUMENT.pdf');

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-generic');
    });

    it('detects generic names in mixed case', async () => {
      const result = await decidePdfRename(createMockContext(), 'DoCuMeNt.pdf');

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-generic');
    });
  });

  describe('isGenericName - Very short names', () => {
    it('detects single letter as too generic', async () => {
      const result = await decidePdfRename(createMockContext(), 'a.pdf');

      expect(result.shouldRename).toBe(true);
      expect(result.reason).toBe('baseline-generic');
    });

    it('allows two-character name if it matches letter pattern (like "ab")', async () => {
      const result = await decidePdfRename(createMockContext(), 'ab.pdf');

      // Two-letter names matching /^[a-z]{2,}$/i (e.g., language codes) are allowed
      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });

    it('allows two-letter meaningful names (like language codes)', async () => {
      // Language codes or abbreviations of 2+ chars should be accepted
      const result = await decidePdfRename(createMockContext(), 'CV.pdf');

      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });

    it('accepts three-character names', async () => {
      const result = await decidePdfRename(createMockContext(), 'abc.pdf');

      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });
  });

  describe('isGenericName - Valid descriptive names', () => {
    it('keeps "Budget-Report-Q1-2024"', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        'Budget-Report-Q1-2024.pdf',
      );

      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });

    it('keeps "Meeting-Notes-2024-10-20"', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        'Meeting-Notes-2024-10-20.pdf',
      );

      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });

    it('keeps filenames with multiple words', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        'Quarterly-Financial-Statement.pdf',
      );

      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });

    it('keeps technical terms like "README" or "CHANGELOG"', async () => {
      const result = await decidePdfRename(createMockContext(), 'README.pdf');

      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });

    it('keeps project names and identifiers', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        'ProjectX-Proposal.pdf',
      );

      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });
  });

  describe('isGenericName - Edge cases', () => {
    it('treats all-numeric names as potentially problematic', async () => {
      const result = await decidePdfRename(createMockContext(), '123456.pdf');

      // This might be a hash or timestamp, not generic per se
      // The heuristic treats it as timestamp if 10+ digits
      expect(result.shouldRename).toBe(false);
    });

    it('allows names with numbers mixed in', async () => {
      const result = await decidePdfRename(
        createMockContext(),
        'Report-2024-Q1.pdf',
      );

      expect(result.shouldRename).toBe(false);
      expect(result.reason).toBe('already-good');
    });
  });
});

describe('decidePdfRename - Multiple extension variants', () => {
  it('correctly strips .pdf extension', async () => {
    const result = await decidePdfRename(createMockContext(), 'document.pdf');

    expect(result.shouldRename).toBe(true);
    expect(result.reason).toBe('baseline-generic');
  });

  it('correctly strips .doc extension', async () => {
    const result = await decidePdfRename(createMockContext(), 'document.doc');

    expect(result.shouldRename).toBe(true);
    expect(result.reason).toBe('baseline-generic');
  });

  it('correctly strips .txt extension', async () => {
    const result = await decidePdfRename(createMockContext(), 'document.txt');

    expect(result.shouldRename).toBe(true);
    expect(result.reason).toBe('baseline-generic');
  });

  it('correctly strips .docx extension', async () => {
    const result = await decidePdfRename(createMockContext(), 'document.docx');

    expect(result.shouldRename).toBe(true);
    expect(result.reason).toBe('baseline-generic');
  });

  it('handles uppercase extensions', async () => {
    const result = await decidePdfRename(createMockContext(), 'document.PDF');

    expect(result.shouldRename).toBe(true);
    expect(result.reason).toBe('baseline-generic');
  });
});

describe('decidePdfRename - Integration scenarios', () => {
  it('prioritizes extracted title over baseline heuristics', async () => {
    const context = createMockContext({
      documentTitle: 'Important Report',
    });
    const result = await decidePdfRename(context, 'abcdef1234567890.pdf');

    expect(result.shouldRename).toBe(true);
    expect(result.reason).toBe('pdf-title-descriptive');
    expect(result.confidence).toBe(0.95);
  });

  it('falls back to hash detection when no title', async () => {
    const context = createMockContext({
      documentTitle: undefined,
    });
    const result = await decidePdfRename(
      context,
      '550e8400-e29b-41d4-a716-446655440000.pdf',
    );

    expect(result.shouldRename).toBe(true);
    expect(result.reason).toBe('baseline-hash');
  });

  it('falls back to timestamp detection when no title', async () => {
    const context = createMockContext({
      documentTitle: undefined,
    });
    const result = await decidePdfRename(context, '2024-10-20-14-30.pdf');

    expect(result.shouldRename).toBe(true);
    expect(result.reason).toBe('baseline-timestamp');
  });

  it('falls back to generic detection when no title', async () => {
    const context = createMockContext({
      documentTitle: undefined,
    });
    const result = await decidePdfRename(context, 'document.pdf');

    expect(result.shouldRename).toBe(true);
    expect(result.reason).toBe('baseline-generic');
  });

  it('preserves good baseline filenames', async () => {
    const context = createMockContext({
      documentTitle: undefined,
    });
    const result = await decidePdfRename(context, 'Q1-Financial-Report.pdf');

    expect(result.shouldRename).toBe(false);
    expect(result.reason).toBe('already-good');
  });
});

describe('decidePdfRename - Confidence levels', () => {
  it('uses highest confidence (0.95) for extracted titles', async () => {
    const context = createMockContext({
      documentTitle: 'Report',
    });
    const result = await decidePdfRename(context, 'file.pdf');

    expect(result.confidence).toBe(0.95);
  });

  it('uses high confidence (0.9) for hash/UUID detection', async () => {
    const context = createMockContext();
    const result = await decidePdfRename(
      context,
      '550e8400-e29b-41d4-a716-446655440000.pdf',
    );

    expect(result.confidence).toBe(0.9);
    expect(result.reason).toBe('baseline-hash');
  });

  it('uses moderate confidence (0.85) for timestamp-only detection', async () => {
    const context = createMockContext();
    const result = await decidePdfRename(context, '2024-10-20.pdf');

    expect(result.confidence).toBe(0.85);
    expect(result.reason).toBe('baseline-timestamp');
  });

  it('uses moderate confidence (0.8) for generic name detection', async () => {
    const context = createMockContext();
    const result = await decidePdfRename(context, 'document.pdf');

    expect(result.confidence).toBe(0.8);
    expect(result.reason).toBe('baseline-generic');
  });

  it('uses lower confidence (0.75) for "already-good" decision', async () => {
    const context = createMockContext();
    const result = await decidePdfRename(context, 'Budget-Report.pdf');

    expect(result.confidence).toBe(0.75);
    expect(result.reason).toBe('already-good');
  });
});
