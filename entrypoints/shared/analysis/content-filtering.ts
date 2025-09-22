export const BASE_STOPWORDS = new Set([
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

export const LINK_STOPWORDS = new Set([
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

export const LINK_TRAILING_STOPWORDS = new Set(['copy', 'file', 'download']);

export const FILENAME_STOPWORDS = new Set([
  'download',
  'downloads',
  'tmp',
  'temp',
  'untitled',
]);

export const URL_STOPWORDS = new Set([
  'download',
  'downloads',
  'file',
  'files',
  'index',
  'view',
]);

export const GENERIC_SUBJECT_TOKENS = new Set([
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

export const SEGMENT_SPLIT_REGEX =
  /(?:\s*\|\s*|\s*•\s*|\s*·\s*|\s*[—–]\s*|\s*::\s*)/;

export function looksLikeHash(token: string): boolean {
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

export function pickBestSegment(value: string, brand: string | null): string {
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

export type CandidateReason = 'Title' | 'Heading' | 'Link' | 'URL' | 'Filename';

export function shouldKeepToken(
  token: string,
  reason: CandidateReason,
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

export function trimLinkTokens(tokens: string[]): string[] {
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

export function computeGenericPenalty(
  value: string,
  reason: CandidateReason,
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

export function normaliseCandidate(
  raw: string,
  brand: string | null,
  reason: CandidateReason,
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
