/**
 * Filename composition and building utilities for Instant Baseline processing
 */

import type { detectFileType } from '@/entrypoints/shared/classification/file-types';
import { applyFilenamePolicy } from '@/entrypoints/shared/naming/policy-engine';
import type { InstantBaselineRenameProposal } from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type { SettingsV1 } from '@/entrypoints/shared/settings/settings';
import { sanitizeLiteralSegment } from './path-utils';

interface ComposeLiteralBaseParams {
  base: string;
  delimiter: string;
  isoDate: string;
  extension: string | null;
  maxLength: number;
}

function composeOriginalWithDateBase({
  base,
  delimiter,
  isoDate,
  extension,
  maxLength,
}: ComposeLiteralBaseParams): string {
  const extensionAllowance = extension ? extension.length + 1 : 0;
  const rawAllowance = maxLength - extensionAllowance;

  // If there's no room even for 1 character, just return the date
  if (rawAllowance <= 0) {
    return isoDate;
  }

  const allowance = rawAllowance;

  const isoLength = isoDate.length;
  if (isoLength >= allowance) {
    return isoDate.slice(isoLength - allowance);
  }

  let workingBase = base;
  const baseEndsWithDelimiter =
    delimiter.length > 0 && workingBase.endsWith(delimiter);

  let joiner = '';
  if (workingBase.length > 0) {
    joiner = baseEndsWithDelimiter ? '' : delimiter;
  }

  let maxBaseLength = allowance - isoLength - joiner.length;
  if (maxBaseLength < 0) {
    joiner = '';
    maxBaseLength = allowance - isoLength;
  }

  if (maxBaseLength < 0) {
    return isoDate.slice(isoLength - allowance);
  }

  if (workingBase.length > maxBaseLength) {
    workingBase = workingBase.slice(0, maxBaseLength);
  }

  if (baseEndsWithDelimiter) {
    if (!workingBase.endsWith(delimiter)) {
      if (maxBaseLength >= delimiter.length) {
        const keep = Math.max(0, maxBaseLength - delimiter.length);
        workingBase = `${workingBase.slice(0, keep)}${delimiter}`;
      } else {
        workingBase = '';
      }
    }
    joiner = '';
  } else if (joiner.length > 0 && workingBase.endsWith(delimiter)) {
    joiner = '';
  }

  if (workingBase.length === 0) {
    return isoDate.slice(isoLength - allowance);
  }

  let candidate = `${workingBase}${joiner}${isoDate}`;
  if (candidate.length <= allowance) {
    return candidate;
  }

  const overflow = candidate.length - allowance;
  if (overflow >= workingBase.length) {
    return isoDate.slice(isoLength - allowance);
  }

  workingBase = workingBase.slice(0, workingBase.length - overflow);

  if (baseEndsWithDelimiter) {
    if (!workingBase.endsWith(delimiter)) {
      if (workingBase.length >= delimiter.length) {
        workingBase = `${workingBase.slice(
          0,
          workingBase.length - delimiter.length,
        )}${delimiter}`;
      } else {
        workingBase = '';
      }
    }
    joiner = '';
  } else {
    joiner =
      delimiter.length > 0 &&
      workingBase.length > 0 &&
      !workingBase.endsWith(delimiter)
        ? delimiter
        : '';
  }

  if (workingBase.length === 0) {
    return isoDate.slice(isoLength - allowance);
  }

  candidate = `${workingBase}${joiner}${isoDate}`;
  if (candidate.length <= allowance) {
    return candidate;
  }

  return candidate.slice(candidate.length - allowance);
}

export function buildOriginalWithDateRename(
  rawBase: string,
  fallbackBase: string,
  delimiter: string,
  isoDate: string,
  extension: string | null,
  directory: string,
  originalPath: string,
  fileType: ReturnType<typeof detectFileType>,
  settings: SettingsV1,
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

  const effectiveDelimiter = delimiter.length > 0 ? delimiter : ' ';
  const baseWithDate = composeOriginalWithDateBase({
    base: baseCandidate,
    delimiter: effectiveDelimiter,
    isoDate,
    extension,
    maxLength: settings.maxLen,
  });

  const normalizedBase = baseWithDate.length > 0 ? baseWithDate : isoDate;
  const filename = extension
    ? `${normalizedBase}.${extension}`
    : normalizedBase;
  const path = directory ? `${directory}/${filename}` : filename;

  return {
    path,
    filename,
    reasonTags: ['Original', 'Date'],
    source: 'metadata',
    originalPath,
    fileType,
  };
}

export function buildRenameProposal(
  subject: string,
  qualifiers: string[],
  extension: string | null,
  directory: string,
  originalPath: string,
  fileType: ReturnType<typeof detectFileType>,
  settings: SettingsV1,
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
