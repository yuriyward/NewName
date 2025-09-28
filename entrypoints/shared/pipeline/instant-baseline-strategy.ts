/**
 * Instant Baseline deterministic strategy evaluator
 */

import type { InstantBaselineSignals } from '@/entrypoints/shared/context/page-analyzer';
import type { DebugContext } from '@/entrypoints/shared/debug/types';
import type {
  InstantBaselineEvaluation,
  InstantBaselineStrategyInputs,
} from '@/entrypoints/shared/pipeline/instant-baseline-types';
import type { SettingsV1 } from '@/entrypoints/shared/settings/settings';
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
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function sanitizePageTitle(title?: string): string | null {
  if (!title) return null;
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function determineStrategyInputs(
  signals: InstantBaselineSignals,
): InstantBaselineStrategyInputs {
  const { name } = splitPath(signals.filename);
  const { base } = stripExtension(name);
  return {
    originalBase: sanitizeBaseName(base),
    rawOriginalBase: base,
    originalDelimiter: detectOriginalDelimiter(base),
    pageTitle: sanitizePageTitle(signals.page?.title ?? undefined) ?? undefined,
    isoDate: parseIsoDate(signals.startTime) ?? undefined,
  };
}

export interface InstantBaselineComputation {
  evaluation: InstantBaselineEvaluation;
  inputs: InstantBaselineStrategyInputs;
}

export function evaluateInstantBaseline(
  signals: InstantBaselineSignals,
  settings: SettingsV1,
): InstantBaselineComputation {
  const strategy = settings.instantBaselineStrategy;
  const { directory, name } = splitPath(signals.filename);
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
    signals.filename,
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
    originalPath: signals.filename,
    subject,
  };

  return { evaluation, inputs };
}

export function evaluateInstantBaselineDebug(
  signals: InstantBaselineSignals,
  settings: SettingsV1,
  downloadId: string,
): DebugContext {
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
}
