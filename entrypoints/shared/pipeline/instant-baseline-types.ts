/**
 * Shared Instant Baseline decision types
 */
import type {
  FileType,
  InstantBaselineStrategy,
} from '@/entrypoints/shared/settings/settings';

export type InstantBaselineGuardrail =
  | 'strategy-applied'
  | 'strategy-unavailable';

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
