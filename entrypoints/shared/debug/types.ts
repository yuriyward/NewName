/**
 * Debug types and interfaces for troubleshooting rename decisions
 */
import type { InstantBaselineSignals } from '@/entrypoints/shared/context/page-analyzer';
import type {
  InstantBaselineEvaluation,
  InstantBaselineStrategyInputs,
} from '@/entrypoints/shared/pipeline/instant-baseline-types';

export type DebugLevel = 'basic' | 'detailed' | 'verbose';

export interface InstantBaselineStrategyDebugSnapshot {
  selected: InstantBaselineEvaluation['strategy'];
  inputs: InstantBaselineStrategyInputs;
  generatedFilename?: string;
}

export interface DebugContext {
  /** Unique identifier for this debug session */
  downloadId: string;
  /** Timestamp when processing started */
  timestamp: number;
  /** Instant Baseline input signals */
  signals: InstantBaselineSignals;
  /** Evaluation outcome shared with runtime */
  evaluation: InstantBaselineEvaluation;
  /** Strategy snapshot (inputs + generated output) */
  strategy: InstantBaselineStrategyDebugSnapshot;
  /** Total processing time in milliseconds */
  processingTime: number;
}

export interface DebugEvent {
  type: 'instant-baseline-start' | 'instant-baseline-complete' | 'decision';
  timestamp: number;
  downloadId: string;
  data: Record<string, unknown>;
}

export interface DebugPolicyResult {
  base: string;
  extension: string | null;
  filename: string;
  debug: {
    input: {
      subject: string;
      qualifiers?: string[];
      extension?: string | null;
      separator: string;
      transliterateAscii?: boolean;
      maxLength: number;
    };
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
