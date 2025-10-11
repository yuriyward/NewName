/**
 * Lexical scoring engine for upgrade proposal evaluation
 */
import type { UpgradeProposal } from '@/entrypoints/shared/history/types';
import { stripExtension } from '@/entrypoints/shared/pipeline/path-utils';
import type { UpgradeScore } from './types';

const UPGRADE_SCORE_THRESHOLD = 18;

const CONFIDENCE_BONUS: Record<UpgradeProposal['confidence'], number> = {
  high: 24,
  suggested: 16,
  alternative: 8,
};

const REASON_TAG_WEIGHTS: Record<string, number> = {
  'contextual-upgrade': 8,
  'media-specs': 6,
  title: 5,
  pagetitle: 5,
  'page-title': 5,
  date: 4,
  'doc-date': 4,
  language: 3,
  geo: 3,
  source: 3,
  'mock-summary': 2,
};

const GENERIC_WORD_PENALTY = [
  'download',
  'document',
  'file',
  'untitled',
  'scan',
];

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, '-');
}

function computeReasonTagBonus(
  reasonTags: readonly string[] | undefined,
): number {
  if (!reasonTags || reasonTags.length === 0) return 0;
  let total = 0;
  for (const tag of reasonTags) {
    const key = normalizeTag(tag);
    total += REASON_TAG_WEIGHTS[key] ?? 2;
  }
  return total;
}

function computeLexicalScore(filename: string): number {
  const { base } = stripExtension(filename);
  const cleaned = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length === 0) return 0;

  const tokens = cleaned.split(' ');
  const lowercaseTokens = tokens.map((token) => token.toLowerCase());
  const uniqueTokenCount = new Set(lowercaseTokens).size;

  let score = tokens.length * 4 + uniqueTokenCount * 2;
  const longTokens = tokens.filter((token) => token.length >= 5).length;
  score += longTokens * 2;

  if (/\d{4}/.test(base)) {
    score += 3;
  }
  if (/[^\da-z]/i.test(base)) {
    score += 1;
  }
  if (/\b\d{6,}\b/.test(base)) {
    score -= 3;
  }
  if (/(copy|final|draft)$/i.test(base)) {
    score -= 2;
  }

  const lowers = cleaned.toLowerCase();
  if (GENERIC_WORD_PENALTY.some((word) => lowers.includes(word))) {
    score -= 4;
  }

  return score;
}

export function scoreUpgradeProposal(
  currentFilename: string,
  proposal: UpgradeProposal,
): UpgradeScore {
  const currentScore = computeLexicalScore(currentFilename);
  const proposedScore = computeLexicalScore(proposal.proposedFilename);
  const lexicalDelta = proposedScore - currentScore;
  const reasonTagBonus = computeReasonTagBonus(proposal.reasonTags);
  const confidenceBonus = CONFIDENCE_BONUS[proposal.confidence] ?? 0;
  const delta = lexicalDelta + reasonTagBonus + confidenceBonus;

  return {
    currentScore,
    proposedScore,
    lexicalDelta,
    reasonTagBonus,
    confidenceBonus,
    delta,
  };
}

export { UPGRADE_SCORE_THRESHOLD };
