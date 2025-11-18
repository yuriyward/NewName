/**
 * Filename composition and building utilities for Instant Baseline processing
 */

import type { detectFileType } from '@/entrypoints/shared/classification/file-types';
import { applyFilenamePolicy } from '@/entrypoints/shared/naming/policy-engine';
import type { InstantBaselineRenameProposal } from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import { applyDateTimePrefix } from './datetime-prefix';
import { sanitizeLiteralSegment } from './path-utils';

/**
 * Build rename proposal with datetime prefix
 *
 * Format: YYYY-MM-DD_HH-MM{separator}{base}.{ext}
 * Example: "2025-11-18_14-30-report.pdf"
 *
 * The separator is determined by:
 * 1. User's explicit separator setting (from settings.separator)
 * 2. Detected delimiter from original filename (fallback)
 * 3. Space (default fallback)
 */
export function buildOriginalWithDateRename(
  rawBase: string,
  fallbackBase: string,
  delimiter: string,
  isoDateTime: string,
  extension: string | null,
  directory: string,
  originalPath: string,
  fileType: ReturnType<typeof detectFileType>,
  settings: Settings,
): InstantBaselineRenameProposal {
  const sanitizedRaw = sanitizeLiteralSegment(rawBase);
  const sanitizedFallback = sanitizeLiteralSegment(fallbackBase);

  const baseCandidate = (() => {
    const trimmedRaw = sanitizedRaw.trim();
    if (trimmedRaw.length > 0) {
      return sanitizedRaw;
    }
    const trimmedFallback = sanitizedFallback.trim();
    if (trimmedFallback.length > 0) {
      return sanitizedFallback;
    }
    return 'file';
  })();

  // Determine effective separator: user setting takes priority, then detected delimiter
  const separatorChar = getSeparatorChar(settings.separator);
  const effectiveSeparator =
    separatorChar || (delimiter.length > 0 ? delimiter : ' ');

  // Calculate length constraints
  const extensionLength = extension ? extension.length + 1 : 0; // +1 for dot
  const datetimeLength = isoDateTime.length; // 16 chars: "YYYY-MM-DD_HH-MM"
  const separatorLength = effectiveSeparator.length;
  const maxBaseLength =
    settings.maxLen - datetimeLength - separatorLength - extensionLength;

  // Truncate base if it exceeds max length
  const truncatedBase =
    maxBaseLength > 0 ? baseCandidate.slice(0, maxBaseLength) : '';

  // If no space for base, just use datetime
  const finalBase =
    truncatedBase.length > 0
      ? applyDateTimePrefix(truncatedBase, isoDateTime, effectiveSeparator)
      : isoDateTime;

  const filename = extension ? `${finalBase}.${extension}` : finalBase;
  const path = directory ? `${directory}/${filename}` : filename;

  return {
    path,
    filename,
    reasonTags: ['DateTime', 'Original'],
    source: 'metadata',
    originalPath,
    fileType,
  };
}

/**
 * Convert separator setting to character
 */
function getSeparatorChar(separator: Settings['separator']): string | null {
  switch (separator) {
    case 'clean':
      return ' ';
    case 'kebab':
      return '-';
    case 'snake':
      return '_';
    default:
      return null;
  }
}

export function buildRenameProposal(
  subject: string,
  qualifiers: string[],
  extension: string | null,
  directory: string,
  originalPath: string,
  fileType: ReturnType<typeof detectFileType>,
  settings: Settings,
  reasonTags: string[],
): InstantBaselineRenameProposal {
  const policy = applyFilenamePolicy({
    subject,
    qualifiers,
    extension,
    maxLength: settings.maxLen,
    separator: settings.separator,
    transliterateAscii: settings.transliterateAscii,
  });

  const filename = policy.filename;
  const path = directory ? `${directory}/${filename}` : filename;

  return {
    path,
    filename,
    reasonTags,
    source: 'metadata',
    originalPath,
    fileType,
  };
}
