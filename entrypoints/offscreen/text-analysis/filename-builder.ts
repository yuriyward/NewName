import type {
  TextUpgradeAnalysisRequest,
  TextUpgradeIngestionResult,
  TextUpgradeModelSource,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import {
  applyFilenamePolicy,
  type FilenamePolicyResult,
} from '@/entrypoints/shared/naming/policy-engine';
import { detectOriginalDelimiter } from '@/entrypoints/shared/pipeline/path-utils';
import { extractExtension } from '@/entrypoints/shared/utils/filename';
import type { PageContext } from '@/entrypoints/shared/state/page-context-store';

/**
 * Extract filename stem (without extension) from baseline filename
 */
export function extractStemFromBaseline(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot > 0 && lastDot < filename.length - 1) {
    return filename.slice(0, lastDot);
  }
  return filename;
}

export interface FilenameContext {
  request: TextUpgradeAnalysisRequest;
  ingestion: TextUpgradeIngestionResult;
  subject: string;
  language?: string;
}

const MIN_CONTEXTUAL_ID_LENGTH = 5;

const UNDERSCORE_DIMENSION_REGEX = /_(\d{3,5})_(\d{3,5})(?=\D|$)/g;
const X_DIMENSION_REGEX = /(\d{3,5})[xX](\d{3,5})(?=\D|$)/g;

function extractContextualNumericTokens(
  baselineStem: string,
  pageContext?: Pick<PageContext, 'title' | 'heading' | 'url'>,
  url?: string | null,
): string[] {
  const candidates = baselineStem
    .split(/[^0-9]+/)
    .map((token) => token.trim())
    .filter((token) => /^\d+$/.test(token) && token.length >= MIN_CONTEXTUAL_ID_LENGTH);

  if (candidates.length === 0) {
    return [];
  }

  const contextPool = [
    pageContext?.title,
    pageContext?.heading,
    pageContext?.url,
    url ?? undefined,
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((value) => value.toLowerCase());

  if (contextPool.length === 0) {
    return [];
  }

  const preserved: string[] = [];
  const seen = new Set<string>();

  for (const token of candidates) {
    if (seen.has(token)) continue;
    const tokenLower = token.toLowerCase();
    const matchesContext = contextPool.some((ctx) => ctx.includes(tokenLower));
    if (matchesContext) {
      preserved.push(token);
      seen.add(token);
    }
  }

  return preserved;
}

function extractDimensionQualifiers(baselineStem: string): string[] {
  const qualifiers = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = UNDERSCORE_DIMENSION_REGEX.exec(baselineStem)) !== null) {
    qualifiers.add(`${match[1]}x${match[2]}`);
  }

  while ((match = X_DIMENSION_REGEX.exec(baselineStem)) !== null) {
    qualifiers.add(`${match[1]}x${match[2]}`);
  }

  return Array.from(qualifiers);
}

export function buildFilename({
  request,
  ingestion: _ingestion, // Unused in simplified version
  subject,
  language,
}: FilenameContext): FilenamePolicyResult {
  const extension =
    extractExtension(request.filename) ??
    extractExtension(request.relativePath) ??
    extractExtension(request.baseline.final) ??
    null;

  const qualifiers: string[] = [];

  const baselineStem = extractStemFromBaseline(
    request.baseline.final || request.filename,
  );
  const baselineNormalized = baselineStem.trim().toLowerCase();
  const subjectNormalized = subject.trim().toLowerCase();
  const originalDelimiter = detectOriginalDelimiter(baselineStem);
  const isKebabLike = originalDelimiter === '-';
  const isSnakeLike = originalDelimiter === '_';
  const isLowercaseBaseline =
    baselineStem.length > 0 && baselineStem === baselineStem.toLowerCase();
  const shouldMirrorBaselineDelimiter =
    request.settings.separator === 'clean' &&
    isLowercaseBaseline &&
    subjectNormalized.length > 0 &&
    subjectNormalized === baselineNormalized &&
    (isKebabLike || isSnakeLike);

  const effectiveSeparator =
    shouldMirrorBaselineDelimiter && isKebabLike
      ? 'kebab'
      : shouldMirrorBaselineDelimiter && isSnakeLike
        ? 'snake'
        : request.settings.separator;

  if (language) {
    const formattedLanguage =
      effectiveSeparator === 'clean'
        ? language.toUpperCase()
        : language.toLowerCase();
    qualifiers.push(formattedLanguage);
  }

  const contextualNumericTokens = extractContextualNumericTokens(
    baselineStem,
    request.pageContext,
    request.url,
  );
  if (request.fileType !== 'image') {
    qualifiers.push(...contextualNumericTokens);
  }

  const dimensionQualifiers = extractDimensionQualifiers(baselineStem);
  qualifiers.push(...dimensionQualifiers);

  const result = applyFilenamePolicy({
    subject,
    qualifiers,
    extension,
    maxLength: request.settings.maxFilenameLength,
    separator: effectiveSeparator,
    transliterateAscii: request.settings.transliterateAscii,
  });

  return result;
}

export function buildProposedPath(
  relativePath: string,
  filename: string,
): string {
  const normalized = relativePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  parts.pop(); // remove existing filename
  parts.push(filename);
  return parts.join('/');
}

export function formatReasonTags(
  language?: string,
  promptUsed?: boolean,
  modelSource: TextUpgradeModelSource = 'on-device',
): string[] {
  const tags = ['ai-text-summary'];
  if (language) {
    tags.push(`language-${language.toLowerCase()}`);
  }
  if (promptUsed) {
    tags.push('ai-prompt-structured');
  }
  if (modelSource === 'cloud') {
    tags.push('ai-cloud-fallback');
  }
  return tags;
}

export function buildProposalSummary(
  language?: string,
  summary?: string | null,
): string | undefined {
  const parts: string[] = [];

  if (language) {
    parts.push(`Language: ${language.toUpperCase()}`);
  }

  if (summary && summary.trim().length > 0) {
    parts.push(summary);
  }

  return parts.length > 0 ? parts.join(' | ') : undefined;
}
