/**
 * Filename generation policies and formatting rules
 */
import type { MediaMetadataSummary } from '@/entrypoints/shared/integrations/mediainfo/media-summary';
import type {
  FileType,
  Separator,
} from '@/entrypoints/shared/settings/settings';
import { extractMediaQualifiers } from './media-qualifiers';

export interface FilenamePolicyInput {
  subject: string;
  qualifiers?: string[];
  extension?: string | null;
  maxLength: number;
  separator: Separator;
  transliterateAscii: boolean;
}

export interface FilenamePolicyResult {
  base: string;
  extension: string | null;
  filename: string;
}

function stripDiacritics(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/Æ/g, 'AE')
    .replace(/æ/g, 'ae')
    .replace(/Œ/g, 'OE')
    .replace(/œ/g, 'oe')
    .replace(/Ł/g, 'L')
    .replace(/ł/g, 'l');
}

function normaliseSeparators(value: string): string {
  return value
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u00b7\u2022]/g, ' ')
    .replace(/[\s\n\r\t]+/g, ' ')
    .replace(/[\\/:*?"<>|]+/g, ' ');
}

function splitIntoTokens(value: string, transliterate: boolean): string[] {
  if (!value) return [];
  let working = value.normalize('NFKC');
  working = normaliseSeparators(working);
  if (transliterate) {
    working = stripDiacritics(working);
  }
  const tokens = working
    .split(/[^0-9\p{L}]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
  return tokens;
}

function isYearToken(token: string): boolean {
  return /^(19|20)\d{2}$/.test(token);
}

function isMonthToken(token: string | undefined): boolean {
  if (token === undefined) return false;
  if (!/^\d{2}$/.test(token)) return false;
  const value = Number.parseInt(token, 10);
  return value >= 1 && value <= 12;
}

function isDayToken(token: string | undefined): boolean {
  if (token === undefined) return false;
  if (!/^\d{2}$/.test(token)) return false;
  const value = Number.parseInt(token, 10);
  return value >= 1 && value <= 31;
}

function isCurrencyToken(token: string | undefined): boolean {
  if (!token) return false;
  if (/^[A-Z]{2,4}$/.test(token)) return true;
  const lowered = token.toLowerCase();
  return (
    lowered === 'zl' ||
    lowered === 'pln' ||
    lowered === 'eur' ||
    lowered === 'usd'
  );
}

function isFractionToken(token: string | undefined): boolean {
  if (!token) return false;
  return /^\d{1,2}$/.test(token);
}

function restoreSpecialTokens(tokens: string[]): string[] {
  const restored: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const current = tokens[index];
    const next = tokens[index + 1];
    const nextNext = tokens[index + 2];

    if (isYearToken(current) && isMonthToken(next) && isDayToken(nextNext)) {
      restored.push(`${current}-${next}-${nextNext}`);
      index += 2;
      continue;
    }

    if (
      /^\d+$/.test(current) &&
      isFractionToken(next) &&
      isCurrencyToken(nextNext)
    ) {
      restored.push(`${current},${next}`);
      index += 1;
      continue;
    }

    restored.push(current);
  }
  return restored;
}

function uniqueTokens(
  tokens: string[],
  existing: Set<string> = new Set(),
): string[] {
  const seen = new Set(existing);
  const result: string[] = [];
  for (const token of tokens) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(token);
  }
  return result;
}

function capitaliseToken(token: string): string {
  if (token.length === 0) {
    return token;
  }
  if (token.length <= 3 && token === token.toUpperCase()) {
    return token.toUpperCase();
  }
  if (/^[\p{Lu}\d]{2,6}$/u.test(token) && token === token.toUpperCase()) {
    return token;
  }
  return token[0].toUpperCase() + token.slice(1).toLowerCase();
}

function formatTokens(tokens: string[], separator: Separator): string[] {
  switch (separator) {
    case 'kebab':
    case 'snake':
      return tokens.map((token) => token.toLowerCase());
    default:
      return tokens.map(capitaliseToken);
  }
}

function prepareTokens(
  subject: string,
  qualifiers: string[] | undefined,
  transliterate: boolean,
): {
  subject: string[];
  qualifiers: string[];
} {
  const subjectTokens = uniqueTokens(
    restoreSpecialTokens(splitIntoTokens(subject, transliterate)),
  );
  const seen = new Set(subjectTokens.map((token) => token.toLowerCase()));
  const qualifierTokens = uniqueTokens(
    restoreSpecialTokens(
      (qualifiers ?? []).flatMap((qualifier) =>
        splitIntoTokens(qualifier, transliterate),
      ),
    ),
    seen,
  );
  return { subject: subjectTokens, qualifiers: qualifierTokens };
}

export function applyFilenamePolicy(
  input: FilenamePolicyInput,
): FilenamePolicyResult {
  const { subject, qualifiers } = prepareTokens(
    input.subject,
    input.qualifiers,
    input.transliterateAscii,
  );
  const formattedSubject = formatTokens(subject, input.separator);
  const formattedQualifiers = formatTokens(qualifiers, input.separator);
  const separatorChar =
    input.separator === 'clean' ? ' ' : input.separator === 'kebab' ? '-' : '_';
  const extension = input.extension
    ? input.extension.replace(/^\.+/, '').toLowerCase()
    : null;

  const allowance = extension
    ? Math.max(1, input.maxLength - (extension.length + 1))
    : Math.max(1, input.maxLength);

  // For longer filenames (>50 chars), add small buffer to improve token inclusion
  // This threshold balances filename readability vs completeness for longer names
  const LONG_FILENAME_THRESHOLD = 50;
  const LONG_FILENAME_BUFFER = 10;
  const effectiveAllowance =
    allowance > LONG_FILENAME_THRESHOLD
      ? allowance + LONG_FILENAME_BUFFER
      : allowance;

  interface TokenEntry {
    value: string;
    type: 'subject' | 'qualifier';
  }

  const seenTokens = new Set<string>();
  const entries: TokenEntry[] = [];

  for (const token of formattedSubject) {
    const key = token.toLowerCase();
    if (seenTokens.has(key) || token.length === 0) continue;
    seenTokens.add(key);
    entries.push({ value: token, type: 'subject' });
  }

  for (const token of formattedQualifiers) {
    const key = token.toLowerCase();
    if (seenTokens.has(key) || token.length === 0) continue;
    seenTokens.add(key);
    entries.push({ value: token, type: 'qualifier' });
  }

  function calculateLength(items: TokenEntry[]): number {
    return items.reduce((total, item, index) => {
      if (item.value.length === 0) return total;
      return (
        total + item.value.length + (index === 0 ? 0 : separatorChar.length)
      );
    }, 0);
  }

  let included: TokenEntry[] = [];

  for (const entry of entries) {
    if (entry.value.length === 0) continue;
    const tentative = [...included, entry];
    if (calculateLength(tentative) <= effectiveAllowance) {
      included = tentative;
      continue;
    }

    if (entry.type === 'qualifier') {
    }
  }

  let usableEntries = included
    .map((entry) => ({ ...entry, value: entry.value.trim() }))
    .filter((entry) => entry.value.length > 0);

  if (usableEntries.length === 0) {
    const fallback = entries.find((entry) => entry.value.trim().length > 0);
    if (fallback) {
      const trimmedFallback = fallback.value.trim().slice(0, allowance);
      if (trimmedFallback.length > 0) {
        usableEntries = [{ value: trimmedFallback, type: 'subject' }];
      }
    }
  }

  if (usableEntries.length === 0) {
    usableEntries = [{ value: 'file', type: 'subject' }];
  }

  const base = usableEntries
    .map((item) => item.value)
    .join(separatorChar)
    .trim();
  const safeBase = base.length > 0 ? base : 'file';
  const filename = extension ? `${safeBase}.${extension}` : safeBase;

  return {
    base: safeBase,
    extension,
    filename,
  };
}

/**
 * Generate enhanced filename with media metadata qualifiers
 */
export function generateMediaEnhancedFilename(
  baseFilename: string,
  summary: MediaMetadataSummary,
  fileType: Extract<FileType, 'audio' | 'video'>,
  settings: {
    maxLength: number;
    separator: Separator;
    transliterateAscii: boolean;
  },
): FilenamePolicyResult {
  // Extract extension from base filename
  const lastDot = baseFilename.lastIndexOf('.');
  const hasExtension = lastDot > 0 && lastDot < baseFilename.length - 1;
  const extension = hasExtension ? baseFilename.slice(lastDot + 1) : null;
  const baseWithoutExt = hasExtension
    ? baseFilename.slice(0, lastDot)
    : baseFilename;

  // Extract media qualifiers
  const mediaQuals = extractMediaQualifiers(summary, fileType);

  // Build qualifiers list: specs + optional duration + optional format
  const qualifiers: string[] = [...mediaQuals.specs];
  if (mediaQuals.duration) {
    qualifiers.push(mediaQuals.duration);
  }
  if (mediaQuals.format && mediaQuals.format.length <= 8) {
    qualifiers.push(mediaQuals.format);
  }

  // Apply policy with media qualifiers
  return applyFilenamePolicy({
    subject: baseWithoutExt,
    qualifiers,
    extension,
    maxLength: settings.maxLength,
    separator: settings.separator,
    transliterateAscii: settings.transliterateAscii,
  });
}
