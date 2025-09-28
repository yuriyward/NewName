/**
 * Shared Instant Baseline decision types
 */
import type { FileType } from '@/entrypoints/shared/settings/settings';

export type InstantBaselineStrategy =
  | 'keep-original'
  | 'original-with-date'
  | 'page-title'
  | 'page-title-with-date';

export function isInstantBaselineStrategy(
  value: unknown,
): value is InstantBaselineStrategy {
  return (
    value === 'keep-original' ||
    value === 'original-with-date' ||
    value === 'page-title' ||
    value === 'page-title-with-date'
  );
}

export type InstantBaselineGuardrail =
  | 'strategy-applied'
  | 'strategy-unavailable'
  | 'evaluation-failed'
  | 'debug-evaluation-failed'
  | 'decision-creation-failed';

export interface InstantBaselineDecisionSignals {
  inputsUsed: string[];
  missingInputs: string[];
}

export interface InstantBaselineDecision {
  outcome: 'rename' | 'keep';
  strategy: InstantBaselineStrategy;
  confidence: 0 | 100;
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
  pageTitle?: string;
  isoDate?: string;
}
