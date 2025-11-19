/**
 * Shared Instant Baseline decision types
 */
import type { FileType } from '@/entrypoints/shared/settings/settings';

export type InstantBaselineStrategy =
  | 'keep-original'
  | 'ai-rename'
  | 'original-with-date';

export function isInstantBaselineStrategy(
  value: unknown,
): value is InstantBaselineStrategy {
  return (
    value === 'keep-original' ||
    value === 'ai-rename' ||
    value === 'original-with-date'
  );
}

export type InstantBaselineGuardrail =
  | 'strategy-applied'
  | 'strategy-deferred'
  | 'strategy-unavailable'
  | 'evaluation-failed'
  | 'debug-evaluation-failed'
  | 'decision-creation-failed';

export function isInstantBaselineGuardrail(
  value: unknown,
): value is InstantBaselineGuardrail {
  return (
    value === 'strategy-applied' ||
    value === 'strategy-deferred' ||
    value === 'strategy-unavailable' ||
    value === 'evaluation-failed' ||
    value === 'debug-evaluation-failed' ||
    value === 'decision-creation-failed'
  );
}

export interface InstantBaselineDecisionSignals {
  inputsUsed: string[];
  missingInputs: string[];
}

export interface InstantBaselineDecision {
  outcome: 'rename' | 'keep';
  strategy: InstantBaselineStrategy;
  confidence: 0 | 50 | 100;
  guardrail: InstantBaselineGuardrail;
  reasons: string[];
  signals: InstantBaselineDecisionSignals;
}

export interface InstantBaselineRenameProposal {
  path: string;
  filename: string;
  reasonTags: string[];
  source: 'on-device' | 'metadata';
  originalPath: string;
  fileType: FileType;
}

export interface InstantBaselineEvaluation {
  decision: InstantBaselineDecision;
  strategy: InstantBaselineStrategy;
  rename?: InstantBaselineRenameProposal;
  reasonTags: string[];
  inputsUsed: string[];
  missingInputs: string[];
  fileType: FileType;
  source: 'on-device' | 'metadata';
  originalPath: string;
  subject: string;
}

export interface InstantBaselineStrategyInputs {
  originalBase: string;
  rawOriginalBase: string;
  originalDelimiter: string;
  isoDate?: string;
  isoDateTime?: string;
}
