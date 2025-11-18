/**
 * Strategy evaluation and decision logic for Instant Baseline processing
 */

import { detectFileType } from '@/entrypoints/shared/classification/file-types';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type {
  InstantBaselineDecision,
  InstantBaselineDecisionSignals,
  InstantBaselineRenameProposal,
  InstantBaselineStrategy,
  InstantBaselineStrategyInputs,
} from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import { buildOriginalWithDateRename } from './filename-composer';
import { stripExtension } from './path-utils';

export function evaluateStrategy(
  strategy: InstantBaselineStrategy,
  inputs: InstantBaselineStrategyInputs,
  extension: string | null,
  directory: string,
  originalPath: string,
  fileType: ReturnType<typeof detectFileType>,
  settings: Settings,
): {
  rename?: InstantBaselineRenameProposal;
  subject: string;
  reasonTags: string[];
  signals: InstantBaselineDecisionSignals;
} {
  try {
    const reasonTags: string[] = [];
    const signals: InstantBaselineDecisionSignals = {
      inputsUsed: [],
      missingInputs: [],
    };

    switch (strategy) {
      case 'keep-original':
        signals.missingInputs.push('strategy:keep-original');
        return { subject: inputs.originalBase, reasonTags, signals };
      case 'ai-rename':
        signals.missingInputs.push('strategy:ai-rename');
        return { subject: inputs.originalBase, reasonTags, signals };
      case 'original-with-date': {
        if (!inputs.isoDateTime) {
          signals.inputsUsed.push('original');
          signals.missingInputs.push('datetime');
          return {
            subject: inputs.originalBase,
            reasonTags,
            signals,
          };
        }
        const rename = buildOriginalWithDateRename(
          inputs.rawOriginalBase,
          inputs.originalBase,
          inputs.originalDelimiter,
          inputs.isoDateTime,
          extension,
          directory,
          originalPath,
          fileType,
          settings,
        );
        signals.inputsUsed.push('original', 'datetime');
        return {
          rename,
          subject:
            inputs.originalBase.length > 0 ? inputs.originalBase : 'file',
          reasonTags: ['DateTime', 'Original'],
          signals,
        };
      }
      default:
        signals.missingInputs.push('strategy:unknown');
        return { subject: inputs.originalBase, reasonTags, signals };
    }
  } catch (error) {
    // Fallback if strategy evaluation fails
    debugLogger.warn('Strategy evaluation failed, using fallback', error);
    return {
      subject: inputs.originalBase || 'file',
      reasonTags: ['Error'],
      signals: {
        inputsUsed: [],
        missingInputs: ['strategy-evaluation-failed'],
      },
    };
  }
}

export function createDecision(
  strategy: InstantBaselineStrategy,
  rename: InstantBaselineRenameProposal | undefined,
  signals: InstantBaselineDecisionSignals,
): InstantBaselineDecision {
  try {
    if (rename) {
      return {
        outcome: 'rename',
        strategy,
        confidence: 50,
        guardrail: 'strategy-applied',
        reasons: [`strategy:${strategy}`],
        signals,
      };
    }

    return {
      outcome: 'keep',
      strategy,
      confidence: 0,
      guardrail:
        strategy === 'ai-rename' ? 'strategy-deferred' : 'strategy-unavailable',
      reasons: [
        `strategy:${strategy}`,
        ...signals.missingInputs.map((input) => `missing:${input}`),
      ],
      signals,
    };
  } catch (error) {
    // Fallback decision if creation fails
    debugLogger.warn('Decision creation failed, using fallback', error);
    return {
      outcome: 'keep',
      strategy,
      confidence: 0,
      guardrail: 'decision-creation-failed',
      reasons: ['decision-creation-error'],
      signals: {
        inputsUsed: [],
        missingInputs: ['decision-creation-failed'],
      },
    };
  }
}

export function determineFileType(filename: string, mime?: string) {
  try {
    const { extension } = stripExtension(filename || '');
    return detectFileType({ mime, extension });
  } catch {
    return 'data' as const;
  }
}
