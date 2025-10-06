/**
 * Filename composition and building utilities for Instant Baseline processing
 */

import type { detectFileType } from '@/entrypoints/shared/classification/file-types';
import { applyFilenamePolicy } from '@/entrypoints/shared/naming/policy-engine';
import type { InstantBaselineRenameProposal } from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import { sanitizeLiteralSegment } from './path-utils';

interface ComposeLiteralBaseParams {
  base: string;
  delimiter: string;
  isoDate: string;
  extension: string | null;
  maxLength: number;
}

function composeOriginalWithDateBase(params: ComposeLiteralBaseParams): string {
  const allowance = calculateAllowance(params.maxLength, params.extension);
  if (allowance <= 0) {
    return isoTail(params.isoDate, allowance);
  }

  const isoLength = params.isoDate.length;
  if (isoLength >= allowance) {
    return isoTail(params.isoDate, allowance);
  }

  const prepared = prepareBaseSegment({ ...params, allowance, isoLength });
  if (!prepared.base) {
    return isoTail(params.isoDate, allowance);
  }

  return finalizeBaseWithDate({
    ...params,
    allowance,
    base: prepared.base,
    joiner: prepared.joiner,
    baseEndsWithDelimiter: prepared.baseEndsWithDelimiter,
  });
}

interface PreparedBase {
  base: string;
  joiner: string;
  baseEndsWithDelimiter: boolean;
}

interface PrepareBaseParams extends ComposeLiteralBaseParams {
  allowance: number;
  isoLength: number;
}

function prepareBaseSegment(params: PrepareBaseParams): PreparedBase {
  const { base, delimiter, isoLength, allowance } = params;
  let workingBase = base;
  const baseEndsWithDelimiter =
    delimiter.length > 0 && workingBase.endsWith(delimiter);

  let joiner =
    workingBase.length > 0 && !baseEndsWithDelimiter ? delimiter : '';

  let maxBaseLength = allowance - isoLength - joiner.length;
  if (maxBaseLength < 0) {
    joiner = '';
    maxBaseLength = allowance - isoLength;
  }

  if (maxBaseLength < 0) {
    return { base: '', joiner: '', baseEndsWithDelimiter };
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

  return { base: workingBase, joiner, baseEndsWithDelimiter };
}

interface FinalizeParams extends ComposeLiteralBaseParams {
  allowance: number;
  base: string;
  joiner: string;
  baseEndsWithDelimiter: boolean;
}

function finalizeBaseWithDate(params: FinalizeParams): string {
  const { baseEndsWithDelimiter, allowance, base, delimiter, isoDate } = params;
  let workingBase = base;
  let joiner = params.joiner;

  let candidate = `${workingBase}${joiner}${isoDate}`;
  if (candidate.length <= allowance) {
    return candidate;
  }

  const overflow = candidate.length - allowance;
  if (overflow >= workingBase.length) {
    return isoTail(isoDate, allowance);
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
  } else if (
    delimiter.length > 0 &&
    workingBase.length > 0 &&
    !workingBase.endsWith(delimiter)
  ) {
    joiner = delimiter;
  } else {
    joiner = '';
  }

  if (workingBase.length === 0) {
    return isoTail(isoDate, allowance);
  }

  candidate = `${workingBase}${joiner}${isoDate}`;
  if (candidate.length <= allowance) {
    return candidate;
  }

  return candidate.slice(candidate.length - allowance);
}

function calculateAllowance(
  maxLength: number,
  extension: string | null,
): number {
  const extensionAllowance = extension ? extension.length + 1 : 0;
  return maxLength - extensionAllowance;
}

function isoTail(isoDate: string, allowance: number): string {
  if (allowance <= 0) return isoDate;
  const isoLength = isoDate.length;
  const start = Math.max(0, isoLength - allowance);
  return isoDate.slice(start);
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
