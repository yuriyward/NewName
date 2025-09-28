/**
 * Path and filename manipulation utilities for Instant Baseline processing
 */

import {
  FORBIDDEN_FILENAME_CHARS,
  MULTI_PART_ARCHIVE_EXTENSIONS,
  ORIGINAL_DELIMITER_CANDIDATES,
} from '@/entrypoints/shared/constants/file-constants';

export function splitPath(path: string): { directory: string; name: string } {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const name = parts.pop() ?? path;
  const directory = parts.join('/');
  return { directory, name };
}

export function stripExtension(filename: string): {
  base: string;
  extension: string | null;
} {
  const lower = filename.toLowerCase();
  for (const multi of MULTI_PART_ARCHIVE_EXTENSIONS) {
    const suffix = `.${multi}`;
    if (lower.endsWith(suffix)) {
      const cutoff = filename.length - suffix.length;
      const base = filename.slice(0, cutoff).replace(/\.+$/, '');
      return { base, extension: multi };
    }
  }

  const match = /^(.*?)(?:\.([A-Za-z0-9]{1,8}))?$/.exec(filename);
  if (!match) {
    return { base: filename, extension: null };
  }
  const [, rawBase, rawExt] = match;
  const base = (rawBase ?? filename).replace(/\.+$/, '');
  const extension = rawExt ? rawExt.toLowerCase() : null;
  return { base, extension };
}

export function sanitizeBaseName(base: string): string {
  return base.replace(/[_]+/g, ' ').trim();
}

function countOccurrences(source: string, token: string): number {
  if (!token || source.length === 0) {
    return 0;
  }
  return source.split(token).length - 1;
}

export function detectOriginalDelimiter(base: string): string {
  const ranked = ORIGINAL_DELIMITER_CANDIDATES.map((separator) => ({
    separator,
    count: countOccurrences(base, separator),
    firstIndex: base.indexOf(separator),
  }))
    .filter((entry) => entry.count > 0 && entry.firstIndex !== -1)
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.firstIndex - b.firstIndex;
    });

  return ranked[0]?.separator ?? ' ';
}

function stripControlCharacters(value: string): string {
  let result = '';
  for (const char of value) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) {
      continue;
    }
    if ((codePoint >= 0 && codePoint < 32) || codePoint === 127) {
      continue;
    }
    result += char;
  }
  return result;
}

export function sanitizeLiteralSegment(value: string): string {
  if (!value) {
    return '';
  }
  const normalisedWhitespace = value.replace(/\r|\n|\t/g, ' ');
  return stripControlCharacters(normalisedWhitespace).replace(
    FORBIDDEN_FILENAME_CHARS,
    ' ',
  );
}
