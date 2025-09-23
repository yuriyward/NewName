/**
 * Content candidate scoring and ranking algorithms
 */
import type { CandidateReason } from '@/entrypoints/shared/analysis/content-filtering';
import {
  computeGenericPenalty,
  normaliseCandidate,
} from '@/entrypoints/shared/analysis/content-filtering';

// Heuristic scoring stays on a 0–100 scale so Phase 1 can make the
// “rename vs keep” decision (threshold 60 per PRD). Base weights come from
// `heuristics-orchestrator` and reflect the order of importance described in
// the business/technical PRDs (link text > headings > titles > URL > filename).
// Modifiers below document why we nudge scores up or down:
// - Length bonus rewards informative human phrases without overshooting.
// - Heading bonus breaks ties when a page provides both title/headings.
// - Fallback score ensures we always return a value even if no signal scores.
const SCORE_LENGTH_BONUS_CAP = 20;
const SCORE_LENGTH_BONUS_START = 12;
const SCORE_HEADING_PRIORITY_BONUS = 6;
const SCORE_FALLBACK_DEFAULT = 10;

export interface Candidate {
  value: string;
  reason: CandidateReason;
  score: number;
  source: 'on-device' | 'metadata';
}

export function addCandidate(
  list: Candidate[],
  raw: string | undefined,
  info: {
    reason: CandidateReason;
    baseScore: number;
    brand: string | null;
    source: Candidate['source'];
  },
): void {
  if (!raw) return;
  const cleaned = normaliseCandidate(raw, info.brand, info.reason);
  if (!cleaned) return;
  let score = info.baseScore;
  const lengthBoost = Math.min(
    SCORE_LENGTH_BONUS_CAP,
    Math.max(0, cleaned.length - SCORE_LENGTH_BONUS_START),
  );
  score += lengthBoost;
  if (info.reason === 'Heading') {
    score += SCORE_HEADING_PRIORITY_BONUS;
  }
  // Penalty kicks in for generic or one-word fragments so we avoid
  // over-valuing boilerplate like “download page”.
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

export function selectBestCandidate(candidates: Candidate[]): Candidate {
  const best = candidates.sort((a, b) => b.score - a.score)[0];
  return (
    best ?? {
      value: 'downloaded file',
      reason: 'Filename',
      score: SCORE_FALLBACK_DEFAULT,
      source: 'metadata' as const,
    }
  );
}
