/**
 * Debug types and interfaces for troubleshooting rename decisions
 */
import type { Candidate } from '@/entrypoints/shared/analysis/candidate-ranking';
import type { Phase1Signals } from '@/entrypoints/shared/context/page-analyzer';
import type {
  FilenamePolicyInput,
  FilenamePolicyResult,
} from '@/entrypoints/shared/naming/policy-engine';
import type { Phase1Outcome } from '@/entrypoints/shared/pipeline/phase1-coordinator';
import type { FileType } from '@/entrypoints/shared/settings/settings';

export type DebugLevel = 'basic' | 'detailed' | 'verbose';

export interface DebugCandidate extends Candidate {
  /** Additional debug info for candidate evaluation */
  debug: {
    originalValue: string;
    lengthBonus: number;
    penalty: number;
    finalScore: number;
    scoreBreakdown: {
      base: number;
      length: number;
      heading?: number;
      penalty: number;
    };
  };
}

export interface DebugPolicyResult extends FilenamePolicyResult {
  /** Additional debug info for policy application */
  debug: {
    input: FilenamePolicyInput;
    tokenProcessing: {
      subjectTokens: string[];
      qualifierTokens: string[];
      formattedSubject: string[];
      formattedQualifiers: string[];
      includedEntries: Array<{
        value: string;
        type: 'subject' | 'qualifier';
      }>;
    };
    lengthCalculation: {
      allowance: number;
      effectiveAllowance: number;
      finalLength: number;
    };
  };
}

export interface DebugQualifierResult {
  qualifiers: string[];
  reasonTags: string[];
  debug: {
    metadata: {
      geo?: string;
      docDate?: string;
      mediaSpecs?: string;
      sourceHint?: string;
    };
    appliedRules: Array<{
      rule: string;
      matched: boolean;
      output?: string;
    }>;
  };
}

export interface DebugHeuristicResult {
  subject: string;
  qualifiers: string[];
  reasonTags: string[];
  fileType: FileType;
  extension: string | null;
  source: 'on-device' | 'metadata';
  debug: {
    candidateEvaluation: DebugCandidate[];
    selectedCandidate: DebugCandidate;
    qualifierAnalysis: DebugQualifierResult;
    processingTime: number;
  };
}

export interface DebugContext {
  /** Unique identifier for this debug session */
  downloadId: string;
  /** Timestamp when processing started */
  timestamp: number;
  /** Phase 1 input signals */
  signals: Phase1Signals;
  /** Debug-enhanced heuristic analysis */
  heuristicResult: DebugHeuristicResult;
  /** Debug-enhanced policy application */
  policyResult: DebugPolicyResult;
  /** Final outcome */
  finalOutcome: Phase1Outcome;
  /** Total processing time in milliseconds */
  processingTime: number;
  /** Whether rename was applied */
  renamed: boolean;
  /** Reason for rename decision */
  decision: {
    shouldRename: boolean;
    reason: string;
    threshold?: number;
    score?: number;
  };
}

export interface DebugEvent {
  type:
    | 'phase1-start'
    | 'phase1-complete'
    | 'candidate-evaluation'
    | 'policy-application'
    | 'decision';
  timestamp: number;
  downloadId: string;
  data: Record<string, unknown>;
}
