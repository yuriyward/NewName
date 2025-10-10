/**
 * Sensitive content detection heuristics for confirmation routing.
 */
import { basename } from '@/entrypoints/shared/utils/filename';

export type SensitiveReason =
  | 'financial-document'
  | 'legal-document'
  | 'personal-identity'
  | 'medical-record';

export interface SensitiveDetectionMatch {
  category: SensitiveReason;
  pattern: string;
  source: 'original-filename' | 'proposed-filename' | 'url' | 'reason-tag';
}

export interface SensitiveDetectionInput {
  originalPath: string;
  proposedPath?: string;
  url?: string | null;
  reasonTags?: readonly string[];
}

export interface SensitiveDetectionResult {
  matches: SensitiveDetectionMatch[];
  reasons: SensitiveReason[];
}

const FINANCIAL_PATTERNS: readonly RegExp[] = [
  /\b(invoice|receipt|statement|bank|paystub|tax|1099|w[-\s]?2)\b/i,
];

const LEGAL_PATTERNS: readonly RegExp[] = [
  /\b(contract|petition|lawsuit|subpoena|nda|agreement|affidavit)\b/i,
];

const PERSONAL_PATTERNS: readonly RegExp[] = [
  /\b(passport|driver'?s\s?license|national\s?id|ssn|social\s?security)\b/i,
];

const MEDICAL_PATTERNS: readonly RegExp[] = [
  /\b(lab\s?results?|medical|prescription|hipaa|x[-\s]?ray|mri|diagnosis)\b/i,
];

const URL_PATTERNS: Array<[RegExp, SensitiveReason]> = [
  [/\/(banking|account|statements?)\//i, 'financial-document'],
  [/\/(legal|compliance|contracts?)\//i, 'legal-document'],
  [/\/(patient|medical|healthcare)\//i, 'medical-record'],
];

const REASON_TAG_MAP = new Map<string, SensitiveReason>([
  ['Financial', 'financial-document'],
  ['Legal', 'legal-document'],
  ['Identity', 'personal-identity'],
  ['Medical', 'medical-record'],
]);

function normaliseValue(value: string | undefined): string {
  return value?.toLowerCase() ?? '';
}

function evaluatePatterns(
  value: string,
  category: SensitiveReason,
  patterns: readonly RegExp[],
  source: SensitiveDetectionMatch['source'],
): SensitiveDetectionMatch[] {
  if (!value) return [];
  return patterns
    .filter((regex) => regex.test(value))
    .map((regex) => ({
      category,
      pattern: regex.source,
      source,
    }));
}

function evaluateUrl(
  url: string | null | undefined,
): SensitiveDetectionMatch[] {
  if (!url) return [];
  return URL_PATTERNS.filter(([regex]) => regex.test(url)).map(
    ([regex, category]) => ({
      category,
      pattern: regex.source,
      source: 'url' as const,
    }),
  );
}

function evaluateReasonTags(
  tags: readonly string[] | undefined,
): SensitiveDetectionMatch[] {
  if (!tags || tags.length === 0) return [];
  const matches: SensitiveDetectionMatch[] = [];
  for (const tag of tags) {
    const lookup = REASON_TAG_MAP.get(tag);
    if (!lookup) continue;
    matches.push({
      category: lookup,
      pattern: tag,
      source: 'reason-tag',
    });
  }
  return matches;
}

function getFilename(value: string): string {
  return basename(value);
}

export function detectSensitiveContent(
  input: SensitiveDetectionInput,
): SensitiveDetectionResult {
  const original = normaliseValue(getFilename(input.originalPath));
  const proposed = normaliseValue(
    input.proposedPath ? getFilename(input.proposedPath) : '',
  );

  const matches: SensitiveDetectionMatch[] = [];

  matches.push(
    ...evaluatePatterns(
      proposed,
      'financial-document',
      FINANCIAL_PATTERNS,
      'proposed-filename',
    ),
  );
  matches.push(
    ...evaluatePatterns(
      original,
      'financial-document',
      FINANCIAL_PATTERNS,
      'original-filename',
    ),
  );

  matches.push(
    ...evaluatePatterns(
      proposed,
      'legal-document',
      LEGAL_PATTERNS,
      'proposed-filename',
    ),
  );
  matches.push(
    ...evaluatePatterns(
      original,
      'legal-document',
      LEGAL_PATTERNS,
      'original-filename',
    ),
  );

  matches.push(
    ...evaluatePatterns(
      proposed,
      'personal-identity',
      PERSONAL_PATTERNS,
      'proposed-filename',
    ),
  );
  matches.push(
    ...evaluatePatterns(
      original,
      'personal-identity',
      PERSONAL_PATTERNS,
      'original-filename',
    ),
  );

  matches.push(
    ...evaluatePatterns(
      proposed,
      'medical-record',
      MEDICAL_PATTERNS,
      'proposed-filename',
    ),
  );
  matches.push(
    ...evaluatePatterns(
      original,
      'medical-record',
      MEDICAL_PATTERNS,
      'original-filename',
    ),
  );

  matches.push(...evaluateUrl(input.url));
  matches.push(...evaluateReasonTags(input.reasonTags));

  const reasons = Array.from(new Set(matches.map((match) => match.category)));

  return {
    matches,
    reasons,
  };
}
