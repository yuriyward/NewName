import { describe, expect, it } from 'vitest';
import { parseSummary, type SummarySegment } from './summary-parser';

describe('parseSummary', () => {
  describe('Plain text summaries', () => {
    it('should parse a simple single-line summary', () => {
      const result = parseSummary('This is a simple summary');

      expect(result).toEqual([{ value: 'This is a simple summary' }]);
    });

    it('should parse multi-line plain text', () => {
      const result = parseSummary(
        'First line of summary\nSecond line of summary',
      );

      expect(result).toEqual([
        { value: 'First line of summary' },
        { value: 'Second line of summary' },
      ]);
    });

    it('should handle empty lines', () => {
      const result = parseSummary('First line\n\n\nSecond line');

      expect(result).toEqual([
        { value: 'First line' },
        { value: 'Second line' },
      ]);
    });

    it('should handle empty string', () => {
      const result = parseSummary('');

      expect(result).toEqual([]);
    });

    it('should handle whitespace-only string', () => {
      const result = parseSummary('   \n\n   \n   ');

      expect(result).toEqual([]);
    });
  });

  describe('Key-value pairs', () => {
    it('should parse a simple key-value pair', () => {
      const result = parseSummary('Document Title: Annual Report');

      expect(result).toEqual([
        { key: 'Document Title', value: 'Annual Report' },
      ]);
    });

    it('should parse multiple key-value pairs', () => {
      const result = parseSummary(
        'Document Title: Annual Report\nAuthor: John Doe\nYear: 2024',
      );

      expect(result).toEqual([
        { key: 'Document Title', value: 'Annual Report' },
        { key: 'Author', value: 'John Doe' },
        { key: 'Year', value: '2024' },
      ]);
    });

    it('should trim whitespace around keys and values', () => {
      const result = parseSummary('  Key  :  Value  ');

      expect(result).toEqual([{ key: 'Key', value: 'Value' }]);
    });

    it('should handle values with multiple colons', () => {
      const result = parseSummary('Time: 10:30:45');

      expect(result).toEqual([{ key: 'Time', value: '10:30:45' }]);
    });

    it('should handle empty values', () => {
      const result = parseSummary('Key:');

      expect(result).toEqual([{ key: 'Key', value: '' }]);
    });
  });

  describe('Pipe-delimited segments', () => {
    it('should parse pipe-delimited plain text', () => {
      const result = parseSummary('First | Second | Third');

      expect(result).toEqual([
        { value: 'First' },
        { value: 'Second' },
        { value: 'Third' },
      ]);
    });

    it('should parse pipe-delimited key-value pairs', () => {
      const result = parseSummary('Page 1: Introduction | Page 2: Methods');

      expect(result).toEqual([
        { key: 'Page 1', value: 'Introduction' },
        { key: 'Page 2', value: 'Methods' },
      ]);
    });

    it('should handle pipes with inconsistent spacing', () => {
      const result = parseSummary('First|Second |  Third  | Fourth');

      expect(result).toEqual([
        { value: 'First' },
        { value: 'Second' },
        { value: 'Third' },
        { value: 'Fourth' },
      ]);
    });
  });

  describe('Mixed content', () => {
    it('should parse mixed key-value and plain text', () => {
      const result = parseSummary(
        'Document Title: Report\nThis is a description\nAuthor: Jane',
      );

      expect(result).toEqual([
        { key: 'Document Title', value: 'Report' },
        { value: 'This is a description' },
        { key: 'Author', value: 'Jane' },
      ]);
    });

    it('should parse mixed newlines and pipes', () => {
      const result = parseSummary(
        'Header: Main Title\nSection 1: Content | Section 2: More content',
      );

      expect(result).toEqual([
        { key: 'Header', value: 'Main Title' },
        { key: 'Section 1', value: 'Content' },
        { key: 'Section 2', value: 'More content' },
      ]);
    });
  });

  describe('Edge cases - long keys', () => {
    it('should NOT parse as key-value if colon is after 40 characters', () => {
      const longKey =
        'This is a very long sentence with more than forty characters: value';
      const result = parseSummary(longKey);

      expect(result).toEqual([{ value: longKey }]);
    });

    it('should parse as key-value if colon is exactly at position 39', () => {
      const exactKey = `${'A'.repeat(39)}: value`;
      const result = parseSummary(exactKey);

      expect(result).toEqual([{ key: 'A'.repeat(39), value: 'value' }]);
    });

    it('should NOT parse as key-value if colon is at position 40', () => {
      const overKey = `${'A'.repeat(40)}: value`;
      const result = parseSummary(overKey);

      expect(result).toEqual([{ value: overKey }]);
    });
  });

  describe('Real-world examples', () => {
    it('should parse PDF document summary', () => {
      const pdfSummary = `Document Title: "Quarterly Financial Report"
Page 1: Executive summary and key metrics
Page 2: Revenue breakdown and analysis`;

      const result = parseSummary(pdfSummary);

      expect(result).toEqual([
        {
          key: 'Document Title',
          value: '"Quarterly Financial Report"',
        },
        { key: 'Page 1', value: 'Executive summary and key metrics' },
        { key: 'Page 2', value: 'Revenue breakdown and analysis' },
      ]);
    });

    it('should parse image description summary', () => {
      const imageSummary = `A sunset over the ocean with vibrant orange and pink colors
Location: Beach | Time: Evening | Mood: Peaceful`;

      const result = parseSummary(imageSummary);

      expect(result).toEqual([
        {
          value: 'A sunset over the ocean with vibrant orange and pink colors',
        },
        { key: 'Location', value: 'Beach' },
        { key: 'Time', value: 'Evening' },
        { key: 'Mood', value: 'Peaceful' },
      ]);
    });

    it('should parse text file summary', () => {
      const textSummary = `Content: Technical documentation about API endpoints
Topics: Authentication | Rate Limiting | Error Handling`;

      const result = parseSummary(textSummary);

      expect(result).toEqual([
        {
          key: 'Content',
          value: 'Technical documentation about API endpoints',
        },
        { key: 'Topics', value: 'Authentication' },
        { value: 'Rate Limiting' },
        { value: 'Error Handling' },
      ]);
    });
  });

  describe('Type safety', () => {
    it('should return correctly typed SummarySegment array', () => {
      const result: SummarySegment[] = parseSummary('Test: Value');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('value');
    });
  });
});
