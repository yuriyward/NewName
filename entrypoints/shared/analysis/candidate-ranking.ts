/**
 * Content candidate scoring and ranking algorithms
 */
import type { CandidateReason } from '@/entrypoints/shared/analysis/content-filtering';
import {
  computeGenericPenalty,
  normaliseCandidate,
} from '@/entrypoints/shared/analysis/content-filtering';

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

export function selectBestCandidate(candidates: Candidate[]): Candidate {
  const best = candidates.sort((a, b) => b.score - a.score)[0];
  return (
    best ?? {
      value: 'downloaded file',
      reason: 'Filename',
      score: 10,
      source: 'metadata' as const,
    }
  );
}
