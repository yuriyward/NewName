/**
 * Verbose debug formatting utilities
 */
import type { DebugContext } from './types';

export function logVerboseContext(context: DebugContext): void {
  console.log('=== NewName Debug Context ===');
  console.log('Download ID:', context.downloadId);
  console.log('Timestamp:', new Date(context.timestamp).toISOString());
  console.log('Processing time:', `${context.processingTime}ms`);
  console.log('');

  console.log('=== Input Signals ===');
  console.table({
    URL: context.signals.url,
    Filename: context.signals.filename,
    MIME: context.signals.mime,
    Referrer: context.signals.referrer || 'none',
    'Page Title': context.signals.page?.title || 'none',
  });

  console.log('');
  console.log('=== Strategy ===');
  console.table({
    Strategy: context.strategy.selected,
    'Original Base': context.strategy.inputs.originalBase,
    'Page Title': context.strategy.inputs.pageTitle || 'none',
    'ISO Date': context.strategy.inputs.isoDate || 'none',
    Output:
      context.strategy.generatedFilename ||
      context.evaluation.originalPath.split(/\\|\//).pop() ||
      context.evaluation.originalPath,
  });

  console.log('');
  console.log('=== Decision ===');
  console.table({
    Outcome: context.evaluation.decision.outcome,
    Strategy: context.evaluation.decision.strategy,
    Confidence: context.evaluation.decision.confidence,
    Guardrail: context.evaluation.decision.guardrail,
    Reasons: context.evaluation.decision.reasons.join(', ') || 'none',
    'Inputs Used': context.evaluation.inputsUsed.join(', ') || 'none',
    'Inputs Missing': context.evaluation.missingInputs.join(', ') || 'none',
  });

  console.log('=== End Debug Context ===');
}
