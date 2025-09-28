/**
 * Instant Baseline deterministic strategy evaluator
 */

import { detectFileType } from '@/entrypoints/shared/classification/file-types';
import type { InstantBaselineSignals } from '@/entrypoints/shared/context/page-analyzer';
import type { DebugContext } from '@/entrypoints/shared/debug/types';
import { applyFilenamePolicy } from '@/entrypoints/shared/naming/policy-engine';
import type {
  InstantBaselineDecision,
  InstantBaselineDecisionSignals,
  InstantBaselineEvaluation,
  InstantBaselineRenameProposal,
  InstantBaselineStrategyInputs,
} from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type {
  InstantBaselineStrategy,
  SettingsV1,
} from '@/entrypoints/shared/settings/settings';

function splitPath(path: string): { directory: string; name: string } {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const name = parts.pop() ?? path;
  const directory = parts.join('/');
  return { directory, name };
}

const MULTI_PART_ARCHIVE_EXTENSIONS = [
  'tar.gz',
  'tar.bz2',
  'tar.xz',
  'tar.zst',
  'tar.lz',
  'tar.lz4',
  'tar.sz',
  'tar.br',
];

function stripExtension(filename: string): {
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

function sanitizeBaseName(base: string): string {
  return base.replace(/[_]+/g, ' ').trim();
}

const ORIGINAL_DELIMITER_CANDIDATES = ['_', '-', ' ', '.'];
const FORBIDDEN_FILENAME_CHARS = /[\\/:*?"<>|]/g;

function countOccurrences(source: string, token: string): number {
  if (!token || source.length === 0) {
    return 0;
  }
  let count = 0;
  let index = source.indexOf(token);
  while (index !== -1) {
    count += 1;
    index = source.indexOf(token, index + token.length);
  }
  return count;
}

function detectOriginalDelimiter(base: string): string {
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

function sanitizeLiteralSegment(value: string): string {
  if (!value) {
    return '';
  }
  const normalisedWhitespace = value.replace(/\r|\n|\t/g, ' ');
  return stripControlCharacters(normalisedWhitespace).replace(
    FORBIDDEN_FILENAME_CHARS,
    ' ',
  );
}

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
  const allowance = Math.max(1, maxLength - extensionAllowance);

  if (allowance <= 0) {
    return isoDate;
  }

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

function buildOriginalWithDateRename(
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

function parseIsoDate(startTime?: string): string | null {
  if (!startTime) return null;
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function sanitizePageTitle(title?: string): string | null {
  if (!title) return null;
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function determineStrategyInputs(
  signals: InstantBaselineSignals,
): InstantBaselineStrategyInputs {
  const { name } = splitPath(signals.filename);
  const { base } = stripExtension(name);
  return {
    originalBase: sanitizeBaseName(base),
    rawOriginalBase: base,
    originalDelimiter: detectOriginalDelimiter(base),
    pageTitle: sanitizePageTitle(signals.page?.title ?? undefined) ?? undefined,
    isoDate: parseIsoDate(signals.startTime) ?? undefined,
  };
}

function buildRenameProposal(
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

function evaluateStrategy(
  strategy: InstantBaselineStrategy,
  inputs: InstantBaselineStrategyInputs,
  extension: string | null,
  directory: string,
  originalPath: string,
  fileType: ReturnType<typeof detectFileType>,
  settings: SettingsV1,
): {
  rename?: InstantBaselineRenameProposal;
  subject: string;
  reasonTags: string[];
  signals: InstantBaselineDecisionSignals;
} {
  const reasonTags: string[] = [];
  const signals: InstantBaselineDecisionSignals = {
    inputsUsed: [],
    missingInputs: [],
  };

  const _useOriginal = () => {
    const subject =
      inputs.originalBase.length > 0 ? inputs.originalBase : 'file';
    return buildRenameProposal(
      subject,
      [],
      extension,
      directory,
      originalPath,
      fileType,
      settings,
      ['Original'],
    );
  };

  switch (strategy) {
    case 'keep-original':
      signals.missingInputs.push('strategy:keep-original');
      return { subject: inputs.originalBase, reasonTags, signals };
    case 'original-with-date': {
      if (!inputs.isoDate) {
        signals.inputsUsed.push('original');
        signals.missingInputs.push('date');
        return {
          subject: inputs.originalBase,
          reasonTags,
          signals,
        };
      }
      const rename = buildOriginalWithDateRename(
        inputs.rawOriginalBase,
        inputs.originalBase,
        inputs.originalDelimiter,
        inputs.isoDate,
        extension,
        directory,
        originalPath,
        fileType,
        settings,
      );
      signals.inputsUsed.push('original', 'date');
      return {
        rename,
        subject: inputs.originalBase.length > 0 ? inputs.originalBase : 'file',
        reasonTags: ['Original', 'Date'],
        signals,
      };
    }
    case 'page-title': {
      if (!inputs.pageTitle) {
        signals.inputsUsed.push('original');
        signals.missingInputs.push('title');
        return {
          subject: inputs.originalBase,
          reasonTags,
          signals,
        };
      }
      const rename = buildRenameProposal(
        inputs.pageTitle,
        [],
        extension,
        directory,
        originalPath,
        fileType,
        settings,
        ['PageTitle'],
      );
      signals.inputsUsed.push('title');
      return {
        rename,
        subject: inputs.pageTitle,
        reasonTags: ['PageTitle'],
        signals,
      };
    }
    case 'page-title-with-date': {
      if (!inputs.pageTitle) {
        signals.inputsUsed.push('original');
        signals.missingInputs.push('title');
        return {
          subject: inputs.originalBase,
          reasonTags,
          signals,
        };
      }
      const qualifiers: string[] = [];
      if (inputs.isoDate) {
        qualifiers.push(inputs.isoDate);
        signals.inputsUsed.push('date');
      } else {
        signals.missingInputs.push('date');
      }
      signals.inputsUsed.push('title');
      const rename = buildRenameProposal(
        inputs.pageTitle,
        qualifiers,
        extension,
        directory,
        originalPath,
        fileType,
        settings,
        qualifiers.length > 0 ? ['PageTitle', 'Date'] : ['PageTitle'],
      );
      return {
        rename,
        subject: inputs.pageTitle,
        reasonTags:
          qualifiers.length > 0 ? ['PageTitle', 'Date'] : ['PageTitle'],
        signals,
      };
    }
    default:
      signals.missingInputs.push('strategy:unknown');
      return { subject: inputs.originalBase, reasonTags, signals };
  }
}

function determineFileType(filename: string, mime?: string) {
  const { extension } = stripExtension(filename);
  return detectFileType({ mime, extension });
}

function createDecision(
  strategy: InstantBaselineStrategy,
  rename: InstantBaselineRenameProposal | undefined,
  signals: InstantBaselineDecisionSignals,
): InstantBaselineDecision {
  if (rename) {
    return {
      outcome: 'rename',
      strategy,
      confidence: 100,
      guardrail: 'strategy-applied',
      reasons: [`strategy:${strategy}`],
      signals,
    };
  }

  return {
    outcome: 'keep',
    strategy,
    confidence: 0,
    guardrail: 'strategy-unavailable',
    reasons: [
      `strategy:${strategy}`,
      ...signals.missingInputs.map((input) => `missing:${input}`),
    ],
    signals,
  };
}

export interface InstantBaselineComputation {
  evaluation: InstantBaselineEvaluation;
  inputs: InstantBaselineStrategyInputs;
}

export function evaluateInstantBaseline(
  signals: InstantBaselineSignals,
  settings: SettingsV1,
): InstantBaselineComputation {
  const strategy = settings.instantBaselineStrategy;
  const { directory, name } = splitPath(signals.filename);
  const { extension } = stripExtension(name);
  const inputs = determineStrategyInputs(signals);
  const fileType = determineFileType(name, signals.mime);

  const {
    rename,
    subject,
    reasonTags,
    signals: decisionSignals,
  } = evaluateStrategy(
    strategy,
    inputs,
    extension,
    directory,
    signals.filename,
    fileType,
    settings,
  );

  const decision = createDecision(strategy, rename, decisionSignals);

  const evaluation: InstantBaselineEvaluation = {
    decision,
    strategy,
    rename,
    reasonTags,
    inputsUsed: decisionSignals.inputsUsed,
    missingInputs: decisionSignals.missingInputs,
    fileType,
    source: rename ? rename.source : 'metadata',
    originalPath: signals.filename,
    subject,
  };

  return { evaluation, inputs };
}

export function evaluateInstantBaselineDebug(
  signals: InstantBaselineSignals,
  settings: SettingsV1,
  downloadId: string,
): DebugContext {
  const startTime = performance.now();
  const { evaluation, inputs } = evaluateInstantBaseline(signals, settings);

  const processingTime = performance.now() - startTime;

  return {
    downloadId,
    timestamp: Date.now(),
    signals,
    evaluation,
    strategy: {
      selected: evaluation.strategy,
      inputs,
      generatedFilename: evaluation.rename?.filename,
    },
    processingTime,
  };
}
