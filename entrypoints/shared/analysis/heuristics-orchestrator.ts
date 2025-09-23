/**
 * Phase 1 content analysis orchestration engine
 */
import {
  addCandidate,
  type Candidate,
  selectBestCandidate,
} from '@/entrypoints/shared/analysis/candidate-ranking';
import { normaliseCandidate } from '@/entrypoints/shared/analysis/content-filtering';
import { deriveQualifiers } from '@/entrypoints/shared/analysis/qualifier-rules';
import { detectFileType } from '@/entrypoints/shared/classification/file-types';
import type { Phase1Signals } from '@/entrypoints/shared/context/page-analyzer';
import {
  deriveDomainBrand,
  extractExtension,
  extractFileName,
  safeDecode,
} from '@/entrypoints/shared/context/page-analyzer';
import type {
  FileType,
  SettingsV1,
} from '@/entrypoints/shared/settings/settings';

const SCORE_LINK_BASE = 95;
const SCORE_HEADING_BASE = 82;
const SCORE_TITLE_BASE = 80;
const SCORE_URL_BASE = 60;
const SCORE_FILENAME_BASE = 55;

export interface Phase1HeuristicResult {
  subject: string;
  qualifiers: string[];
  reasonTags: string[];
  fileType: FileType;
  extension: string | null;
  source: 'on-device' | 'metadata';
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
    baseScore: SCORE_LINK_BASE,
    brand,
    source: 'on-device',
  });

  addCandidate(candidates, signals.page?.heading, {
    reason: 'Heading',
    baseScore: SCORE_HEADING_BASE,
    brand,
    source: 'on-device',
  });

  addCandidate(candidates, signals.page?.title, {
    reason: 'Title',
    baseScore: SCORE_TITLE_BASE,
    brand,
    source: 'on-device',
  });

  addCandidate(candidates, safeDecode(url.pathname.split('/').pop() ?? ''), {
    reason: 'URL',
    baseScore: SCORE_URL_BASE,
    brand,
    source: 'metadata',
  });

  addCandidate(candidates, baseName ?? extractFileName(signals.filename), {
    reason: 'Filename',
    baseScore: SCORE_FILENAME_BASE,
    brand,
    source: 'metadata',
  });

  const chosen = selectBestCandidate(candidates);

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
