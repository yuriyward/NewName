/**
 * Content candidate scoring and ranking algorithms
 */
import type { CandidateReason } from '@/entrypoints/shared/analysis/content-filtering';
import {
  computeGenericPenalty,
  normaliseCandidate,
} from '@/entrypoints/shared/analysis/content-filtering';
import type { DebugCandidate } from '@/entrypoints/shared/debug/types';

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
  const headingBonus =
    info.reason === 'Heading' ? SCORE_HEADING_PRIORITY_BONUS : 0;
  score += headingBonus;

  // Penalty kicks in for generic or one-word fragments so we avoid
  // over-valuing boilerplate like "download page".
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

export function addDebugCandidate(
  list: DebugCandidate[],
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
  const lengthBonus = Math.min(
    SCORE_LENGTH_BONUS_CAP,
    Math.max(0, cleaned.length - SCORE_LENGTH_BONUS_START),
  );
  score += lengthBonus;
  const headingBonus =
    info.reason === 'Heading' ? SCORE_HEADING_PRIORITY_BONUS : 0;
  score += headingBonus;

  // Penalty kicks in for generic or one-word fragments so we avoid
  // over-valuing boilerplate like "download page".
  const penalty = computeGenericPenalty(cleaned, info.reason);
  const finalScore = penalty > 0 ? Math.max(0, score - penalty) : score;

  list.push({
    value: cleaned,
    reason: info.reason,
    score: finalScore,
    source: info.source,
    debug: {
      originalValue: raw,
      lengthBonus,
      penalty,
      finalScore,
      scoreBreakdown: {
        base: info.baseScore,
        length: lengthBonus,
        heading: headingBonus,
        penalty,
      },
    },
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

export function selectBestDebugCandidate(
  candidates: DebugCandidate[],
): DebugCandidate {
  const best = candidates.sort((a, b) => b.score - a.score)[0];
  return (
    best ?? {
      value: 'downloaded file',
      reason: 'Filename',
      score: SCORE_FALLBACK_DEFAULT,
      source: 'metadata' as const,
      debug: {
        originalValue: 'downloaded file',
        lengthBonus: 0,
        penalty: 0,
        finalScore: SCORE_FALLBACK_DEFAULT,
        scoreBreakdown: {
          base: SCORE_FALLBACK_DEFAULT,
          length: 0,
          heading: 0,
          penalty: 0,
        },
      },
    }
  );
}
