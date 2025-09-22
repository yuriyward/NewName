import { detectFileType } from '@/entrypoints/shared/renaming/file-types';
import type {
  FileType,
  SettingsV1,
} from '@/entrypoints/shared/settings/settings';

export interface PageContextSnapshot {
  title?: string;
  heading?: string;
  linkText?: string;
  linkRel?: string;
  capturedAt: number;
}

export interface Phase1Signals {
  url: string;
  referrer?: string;
  filename: string;
  mime?: string;
  startTime?: string;
  page?: PageContextSnapshot | null;
}

export interface Phase1HeuristicResult {
  subject: string;
  qualifiers: string[];
  reasonTags: string[];
  fileType: FileType;
  extension: string | null;
  source: 'on-device' | 'metadata';
}

interface Candidate {
  value: string;
  reason: 'Title' | 'Heading' | 'Link' | 'URL' | 'Filename';
  score: number;
  source: 'on-device' | 'metadata';
}

const BASE_STOPWORDS = new Set([
  'click',
  'here',
  'final',
  'copy',
  'attachment',
  'attachments',
  'preview',
  'view',
  'new',
  'untitled',
  'scan',
  'image',
  'images',
  'company',
  'documents',
]);

const LINK_STOPWORDS = new Set([
  'download',
  'downloads',
  'pobierz',
  'kliknij',
  'click',
  'here',
  'to',
  'get',
  'save',
  'open',
  'view',
  'see',
  'show',
]);

const LINK_TRAILING_STOPWORDS = new Set(['copy', 'file', 'download']);

const FILENAME_STOPWORDS = new Set([
  'download',
  'downloads',
  'tmp',
  'temp',
  'untitled',
]);

const URL_STOPWORDS = new Set([
  'download',
  'downloads',
  'file',
  'files',
  'index',
  'view',
]);

const GENERIC_SUBJECT_TOKENS = new Set([
  'download',
  'portal',
  'page',
  'default',
  'index',
  'file',
  'files',
  'copy',
  'attachment',
]);

const SEGMENT_SPLIT_REGEX = /(?:\s*\|\s*|\s*•\s*|\s*·\s*|\s*[—–]\s*|\s*::\s*)/;

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractFileName(path: string): string {
  const parts = path.split(/[\\/]+/);
  return parts[parts.length - 1] ?? path;
}

function extractExtension(name: string): string | null {
  const match = /\.([A-Za-z0-9]{1,8})$/u.exec(name);
  return match ? match[1] : null;
}

function deriveDomainBrand(url: URL): string | null {
  const parts = url.hostname
    .split('.')
    .filter((segment) => segment && segment !== 'www' && segment !== 'm');
  if (parts.length === 0) return null;
  const last = parts[parts.length - 1];
  const secondLast = parts.length >= 2 ? parts[parts.length - 2] : null;
  if (last.length <= 3 && secondLast) {
    return secondLast.toLowerCase();
  }
  return last.toLowerCase();
}

function looksLikeHash(token: string): boolean {
  if (token.length < 8) return false;

  if (/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3,}[0-9a-f]{8}$/i.test(token)) {
    return true;
  }

  if (/^[0-9a-f-]{8,}$/i.test(token)) {
    return true;
  }

  if (/^[A-Za-z0-9+/=_-]{12,}={0,2}$/i.test(token)) {
    return true;
  }

  if (/^[A-HJ-NP-Za-km-z1-9]{16,}$/.test(token)) {
    return true;
  }

  const alphanumeric = token.replace(/[^A-Za-z0-9]/g, '');
  if (alphanumeric.length >= 16) {
    const uniqueChars = new Set(alphanumeric.toLowerCase());
    if (uniqueChars.size >= Math.min(10, alphanumeric.length / 2)) {
      return true;
    }
  }

  return false;
}

function pickBestSegment(value: string, brand: string | null): string {
  const segments = value
    .split(SEGMENT_SPLIT_REGEX)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) return value.trim();
  const brandFiltered = brand
    ? segments.filter((segment) => !segment.toLowerCase().includes(brand))
    : segments;
  const pool = brandFiltered.length > 0 ? brandFiltered : segments;
  return pool.reduce((longest, segment) => {
    if (segment.length > longest.length) {
      return segment;
    }
    return longest;
  }, pool[0]);
}

function shouldKeepToken(
  token: string,
  reason: Candidate['reason'],
  _brand: string | null,
): boolean {
  if (!token) return false;
  if (token === '-') return true;
  if (/^[-–—]+$/.test(token)) return false;
  const lower = token.toLowerCase();
  if (looksLikeHash(token)) return false;
  if (/^\d{8,}$/.test(token)) return false;
  if (BASE_STOPWORDS.has(lower)) return false;
  if (reason === 'Link' && LINK_STOPWORDS.has(lower)) return false;
  if (
    (reason === 'Filename' || reason === 'URL') &&
    FILENAME_STOPWORDS.has(lower)
  )
    return false;
  if (reason === 'URL' && URL_STOPWORDS.has(lower)) return false;
  return true;
}

function trimLinkTokens(tokens: string[]): string[] {
  let start = 0;
  let end = tokens.length;
  while (start < end && LINK_STOPWORDS.has(tokens[start].toLowerCase())) {
    start += 1;
  }
  while (
    end > start &&
    LINK_TRAILING_STOPWORDS.has(tokens[end - 1].toLowerCase())
  ) {
    end -= 1;
  }
  return tokens.slice(start, end);
}

function computeGenericPenalty(
  value: string,
  reason: Candidate['reason'],
): number {
  if (reason === 'Filename' || reason === 'Link') return 0;
  const tokens = value.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  const informative = tokens.filter(
    (token) => !GENERIC_SUBJECT_TOKENS.has(token),
  );
  if (informative.length === 0) {
    return 40;
  }
  if (tokens.length <= 2 && informative.length === 1) {
    return 20;
  }
  return 0;
}

function normaliseCandidate(
  raw: string,
  brand: string | null,
  reason: Candidate['reason'],
): string | null {
  if (!raw) return null;
  const value = raw
    .replace(/\s+/g, ' ')
    .replace(/[[\](){}]+/g, ' ')
    .replace(/[_]+/g, ' ')
    .replace(
      /\s*(?:\.|-)?\s*(?:pdf|docx?|doc|xlsx?|xls|pptx?|ppt|txt|csv|json|mp3|mp4|jpg|jpeg|png|gif|zip)$/i,
      '',
    )
    .trim();
  if (!value) return null;

  const segment = pickBestSegment(value, brand);
  const tokens = segment
    .replace(/\s-\s/g, ' @@dash@@ ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .map((token) => (token === '@@dash@@' ? '-' : token.trim()))
    .filter(Boolean);

  const filtered: string[] = [];
  for (const token of tokens) {
    if (!shouldKeepToken(token, reason, brand)) continue;
    filtered.push(token);
  }

  if (filtered.length === 0) return null;

  let finalTokens = reason === 'Link' ? trimLinkTokens(filtered) : filtered;
  if (finalTokens.length === 0) {
    finalTokens = filtered;
  }

  const cleaned = finalTokens.join(' ').trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length < 3 && finalTokens.length === 1) {
    const [single] = finalTokens;
    return single.length >= 1 ? single : null;
  }
  return cleaned;
}

function addCandidate(
  list: Candidate[],
  raw: string | undefined,
  info: {
    reason: Candidate['reason'];
    baseScore: number;
    brand: string | null;
    source: Candidate['source'];
  },
): void {
  if (!raw) return;
  const cleaned = normaliseCandidate(raw, info.brand, info.reason);
  if (!cleaned) return;
  let score = info.baseScore;
  const lengthBoost = Math.min(20, Math.max(0, cleaned.length - 12));
  score += lengthBoost;
  if (info.reason === 'Heading') {
    score += 6;
  }
  const penalty = computeGenericPenalty(cleaned, info.reason);
  if (penalty > 0) {
    score = Math.max(0, score - penalty);
  }
  list.push({
    value: cleaned,
    reason: info.reason,
    score,
    source: info.source,
  });
}

interface QualifierState {
  qualifiers: string[];
  reasons: string[];
  lowerCandidate: string;
}

interface DeriveQualifiersParams {
  signals: Phase1Signals;
  candidate: Candidate;
  brand: string | null;
  fileType: FileType;
  settings: SettingsV1;
}

type QualifierRule = (
  state: QualifierState,
  params: DeriveQualifiersParams,
) => void;

function pushQualifier(
  state: QualifierState,
  qualifier: string,
  reason: string,
): void {
  const trimmed = qualifier.trim();
  if (trimmed.length === 0) return;
  state.qualifiers.push(trimmed);
  state.reasons.push(reason);
}

const applyDocumentDateQualifier: QualifierRule = (state, params) => {
  if (!params.settings.metadataToggles.docDate) return;
  if (!params.signals.startTime) return;

  const date = new Date(params.signals.startTime);
  if (Number.isNaN(date.getTime())) return;

  const yearFragment = date.getFullYear().toString();
  if (state.lowerCandidate.includes(yearFragment)) return;

  const iso = date.toISOString().slice(0, 10);
  pushQualifier(state, iso, 'Date');
};

const applySourceQualifier: QualifierRule = (state, params) => {
  if (!params.settings.metadataToggles.sourceHint) return;
  if (!params.brand) return;

  const lowerBrand = params.brand.toLowerCase();
  if (state.lowerCandidate.includes(lowerBrand)) return;

  pushQualifier(state, params.brand, 'Source');
};

const applyMediaSpecQualifier: QualifierRule = (state, params) => {
  if (params.fileType !== 'image') return;
  if (!params.settings.metadataToggles.mediaSpecs) return;

  const dimensionHint = extractResolutionFromFilename(params.signals.filename);
  if (!dimensionHint) return;

  if (state.lowerCandidate.includes(dimensionHint.toLowerCase())) return;

  pushQualifier(state, dimensionHint, 'Spec');
};

const QUALIFIER_RULES: QualifierRule[] = [
  applyDocumentDateQualifier,
  applySourceQualifier,
  applyMediaSpecQualifier,
];

function deriveQualifiers(params: DeriveQualifiersParams): {
  qualifiers: string[];
  reasonTags: string[];
} {
  const state: QualifierState = {
    qualifiers: [],
    reasons: [],
    lowerCandidate: params.candidate.value.toLowerCase(),
  };

  for (const applyQualifier of QUALIFIER_RULES) {
    applyQualifier(state, params);
  }

  return { qualifiers: state.qualifiers, reasonTags: state.reasons };
}

function extractResolutionFromFilename(filename: string): string | null {
  const base = extractFileName(filename);
  const match = base.match(/(\d{3,5})[x×](\d{3,5})/i);
  if (!match) return null;
  return `${match[1]}x${match[2]}`;
}

export function runPhase1Heuristics(
  signals: Phase1Signals,
  settings: SettingsV1,
): Phase1HeuristicResult {
  const url = new URL(signals.url);
  const brand = deriveDomainBrand(url);
  const downloadName = extractFileName(signals.filename);
  const extension =
    extractExtension(downloadName) ?? extractExtension(url.pathname);
  const fileType = detectFileType({ mime: signals.mime, extension });

  const baseName = normaliseCandidate(downloadName, brand, 'Filename');
  const candidates: Candidate[] = [];

  addCandidate(candidates, signals.page?.linkText, {
    reason: 'Link',
    baseScore: 95,
    brand,
    source: 'on-device',
  });

  addCandidate(candidates, signals.page?.heading, {
    reason: 'Heading',
    baseScore: 82,
    brand,
    source: 'on-device',
  });

  addCandidate(candidates, signals.page?.title, {
    reason: 'Title',
    baseScore: 80,
    brand,
    source: 'on-device',
  });

  addCandidate(candidates, safeDecode(url.pathname.split('/').pop() ?? ''), {
    reason: 'URL',
    baseScore: 60,
    brand,
    source: 'metadata',
  });

  addCandidate(candidates, baseName ?? extractFileName(signals.filename), {
    reason: 'Filename',
    baseScore: 55,
    brand,
    source: 'metadata',
  });

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  const chosen = best ?? {
    value: baseName ?? 'downloaded file',
    reason: 'Filename',
    score: 10,
    source: 'metadata' as const,
  };

  const { qualifiers, reasonTags } = deriveQualifiers({
    signals,
    candidate: chosen,
    brand,
    fileType,
    settings,
  });

  const combinedReasons = new Set<string>([chosen.reason, ...reasonTags]);

  return {
    subject: chosen.value,
    qualifiers,
    reasonTags: Array.from(combinedReasons),
    fileType,
    extension,
    source: chosen.source,
  };
}
