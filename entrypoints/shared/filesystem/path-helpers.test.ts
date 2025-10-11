import { describe, expect, it } from 'vitest';
import {
  buildManagedPath,
  normalizeDownloadPath,
  normalizeManagedPrefix,
} from './path-helpers';

describe('normalizeDownloadPath', () => {
  it('removes leading slashes and collapses separators', () => {
    expect(normalizeDownloadPath('/foo//bar/baz.pdf')).toBe('foo/bar/baz.pdf');
    expect(normalizeDownloadPath('\\foo\\bar\\baz.pdf')).toBe(
      'foo/bar/baz.pdf',
    );
  });

  it('returns empty string for falsy input', () => {
    expect(normalizeDownloadPath('')).toBe('');
    expect(normalizeDownloadPath(undefined)).toBe('');
  });
});

describe('normalizeManagedPrefix', () => {
  it('returns null for empty values', () => {
    expect(normalizeManagedPrefix(null)).toBeNull();
    expect(normalizeManagedPrefix('')).toBeNull();
  });

  it('trims slashes, dots, and whitespace', () => {
    expect(normalizeManagedPrefix('/NewName/')).toBe('NewName');
    expect(normalizeManagedPrefix('NewName...')).toBe('NewName');
    expect(normalizeManagedPrefix('  Project/NewName/  ')).toBe(
      'Project/NewName',
    );
  });
});

describe('buildManagedPath', () => {
  it('joins prefix and relative path with a single slash', () => {
    expect(buildManagedPath('NewName', 'Report.pdf')).toBe(
      'NewName/Report.pdf',
    );
    expect(buildManagedPath('NewName/', '/Report.pdf')).toBe(
      'NewName/Report.pdf',
    );
  });

  it('handles empty segments', () => {
    expect(buildManagedPath('', 'Report.pdf')).toBe('Report.pdf');
    expect(buildManagedPath('NewName', '')).toBe('NewName');
  });
});
