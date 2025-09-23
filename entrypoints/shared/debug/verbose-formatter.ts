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
    'Page Heading': context.signals.page?.heading || 'none',
    'Link Text': context.signals.page?.linkText || 'none',
  });

  if (context.heuristicResult?.debug) {
    console.log('');
    console.log('=== Candidate Evaluation ===');
    console.table(
      context.heuristicResult.debug.candidateEvaluation.map((c) => ({
        Value: c.value,
        Reason: c.reason,
        Score: c.score,
        'Base Score': c.debug.scoreBreakdown.base,
        'Length Bonus': c.debug.scoreBreakdown.length,
        Penalty: c.debug.scoreBreakdown.penalty,
      })),
    );

    console.log('');
    console.log('=== Selected Candidate ===');
    const selected = context.heuristicResult.debug.selectedCandidate;
    console.table({
      Value: selected.value,
      Reason: selected.reason,
      'Final Score': selected.score,
      Source: selected.source,
    });

    if (context.heuristicResult.debug.qualifierAnalysis?.debug) {
      console.log('');
      console.log('=== Qualifier Analysis ===');
      const qa = context.heuristicResult.debug.qualifierAnalysis;
      console.log('Applied qualifiers:', qa.qualifiers);
      console.log('Reason tags:', qa.reasonTags);
      console.table(qa.debug.appliedRules);
    }
  }

  if (context.policyResult?.debug) {
    console.log('');
    console.log('=== Policy Application ===');
    const pd = context.policyResult.debug;
    console.log('Subject tokens:', pd.tokenProcessing.subjectTokens);
    console.log('Qualifier tokens:', pd.tokenProcessing.qualifierTokens);
    console.log('Formatted subject:', pd.tokenProcessing.formattedSubject);
    console.log(
      'Formatted qualifiers:',
      pd.tokenProcessing.formattedQualifiers,
    );
    console.table({
      Allowance: pd.lengthCalculation.allowance,
      'Effective Allowance': pd.lengthCalculation.effectiveAllowance,
      'Final Length': pd.lengthCalculation.finalLength,
    });
  }

  console.log('');
  console.log('=== Final Decision ===');
  console.table({
    'Should Rename': context.decision.shouldRename,
    Reason: context.decision.reason,
    Threshold: context.decision.threshold || 'N/A',
    Score: context.decision.score || 'N/A',
    'Final Path': context.finalOutcome.path,
    'File Type': context.finalOutcome.fileType,
    Source: context.finalOutcome.source,
  });

  console.log('=== End Debug Context ===');
}
