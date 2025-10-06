/**
 * Instant Baseline deterministic strategy evaluator
 */

import type { InstantBaselineSignals } from '@/entrypoints/shared/context/page-analyzer';
import type { DebugContext } from '@/entrypoints/shared/debug/types';
import type {
  InstantBaselineEvaluation,
  InstantBaselineGuardrail,
  InstantBaselineStrategyInputs,
} from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type { Settings } from '@/entrypoints/shared/settings/settings';
import {
  detectOriginalDelimiter,
  sanitizeBaseName,
  splitPath,
  stripExtension,
} from './path-utils';
import {
  createDecision,
  determineFileType,
  evaluateStrategy,
} from './strategy-evaluator';

function parseIsoDate(startTime?: string): string | null {
  if (!startTime) return null;
  const timestamp = Date.parse(startTime);
  if (!Number.isFinite(timestamp)) return null;
  const iso = new Date(timestamp).toISOString();
  // Defensive: ensure the derived ISO string produces a calendar date portion
  return iso.length >= 10 ? iso.slice(0, 10) : null;
}

function sanitizePageTitle(title?: string): string | null {
  if (!title) return null;
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function determineStrategyInputs(
  signals: InstantBaselineSignals,
): InstantBaselineStrategyInputs {
  try {
    const { name } = splitPath(signals.filename || '');
    const { base } = stripExtension(name);
    return {
      originalBase: sanitizeBaseName(base),
      rawOriginalBase: base,
      originalDelimiter: detectOriginalDelimiter(base),
      pageTitle:
        sanitizePageTitle(signals.page?.title ?? undefined) ?? undefined,
      isoDate: parseIsoDate(signals.startTime) ?? undefined,
    };
  } catch {
    // Fallback to safe defaults if input parsing fails
    return {
      originalBase: 'file',
      rawOriginalBase: 'file',
      originalDelimiter: ' ',
      pageTitle: undefined,
      isoDate: undefined,
    };
  }
}

export interface InstantBaselineComputation {
  evaluation: InstantBaselineEvaluation;
  inputs: InstantBaselineStrategyInputs;
}

export function evaluateInstantBaseline(
  signals: InstantBaselineSignals,
  settings: Settings,
): InstantBaselineComputation {
  try {
    const strategy = settings.instantBaselineStrategy;
    const { directory, name } = splitPath(signals.filename || '');
    const { extension } = stripExtension(name);
    const inputs = determineStrategyInputs(signals);
    const fileType = determineFileType(name, signals.mime);

    const {
      rename,
      subject,
      reasonTags,
      signals: decisionSignals,
    } = evaluateStrategy(
      strategy,
      inputs,
      extension,
      directory,
      signals.filename || '',
      fileType,
      settings,
    );

    const decision = createDecision(strategy, rename, decisionSignals);

    const evaluation: InstantBaselineEvaluation = {
      decision,
      strategy,
      rename,
      reasonTags,
      inputsUsed: decisionSignals.inputsUsed,
      missingInputs: decisionSignals.missingInputs,
      fileType,
      source: rename ? rename.source : 'metadata',
      originalPath: signals.filename || '',
      subject,
    };

    return { evaluation, inputs };
  } catch (error) {
    // Fallback evaluation if processing fails
    console.warn('InstantBaseline evaluation failed, using fallback', error);
    const fallbackInputs = determineStrategyInputs(signals);
    const fallbackEvaluation = createFallbackEvaluation(
      signals,
      settings.instantBaselineStrategy,
      {
        guardrail: 'evaluation-failed',
        reason: 'evaluation-error',
        missingInput: 'evaluation-failed',
        reasonTag: 'Error',
      },
    );
    return { evaluation: fallbackEvaluation, inputs: fallbackInputs };
  }
}

export function evaluateInstantBaselineDebug(
  signals: InstantBaselineSignals,
  settings: Settings,
  downloadId: string,
): DebugContext {
  try {
    const startTime = performance.now();
    const { evaluation, inputs } = evaluateInstantBaseline(signals, settings);

    const processingTime = performance.now() - startTime;

    return {
      downloadId,
      timestamp: Date.now(),
      signals,
      evaluation,
      strategy: {
        selected: evaluation.strategy,
        inputs,
        generatedFilename: evaluation.rename?.filename,
      },
      processingTime,
    };
  } catch (error) {
    // Fallback debug context if evaluation fails
    console.warn(
      'InstantBaseline debug evaluation failed, using fallback',
      error,
    );
    const fallbackInputs = determineStrategyInputs(signals);
    const fallbackEvaluation = createFallbackEvaluation(
      signals,
      settings.instantBaselineStrategy,
      {
        guardrail: 'debug-evaluation-failed',
        reason: 'debug-evaluation-error',
        missingInput: 'debug-evaluation-failed',
        reasonTag: 'DebugError',
      },
    );
    return {
      downloadId,
      timestamp: Date.now(),
      signals,
      evaluation: fallbackEvaluation,
      strategy: {
        selected: settings.instantBaselineStrategy,
        inputs: fallbackInputs,
        generatedFilename: undefined,
      },
      processingTime: 0,
    };
  }
}

interface FallbackConfig {
  guardrail: InstantBaselineGuardrail;
  reason: string;
  missingInput: string;
  reasonTag: string;
}

function createFallbackEvaluation(
  signals: InstantBaselineSignals,
  strategy: Settings['instantBaselineStrategy'],
  config: FallbackConfig,
): InstantBaselineEvaluation {
  return {
    decision: {
      outcome: 'keep',
      strategy,
      confidence: 0,
      guardrail: config.guardrail,
      reasons: [config.reason],
      signals: {
        inputsUsed: [],
        missingInputs: [config.missingInput],
      },
    },
    strategy,
    rename: undefined,
    reasonTags: [config.reasonTag],
    inputsUsed: [],
    missingInputs: [config.missingInput],
    fileType: 'data',
    source: 'metadata',
    originalPath: signals.filename || '',
    subject: 'file',
  };
}
