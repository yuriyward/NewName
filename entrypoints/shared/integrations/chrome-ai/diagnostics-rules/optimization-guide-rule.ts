import type { DiagnosticIssue, DiagnosticResult } from '../diagnostics';

export interface OptimizationGuideContext {
  allModelsUnavailable: boolean;
}

export function checkOptimizationGuide(
  context: OptimizationGuideContext,
): DiagnosticResult | null {
  if (!context.allModelsUnavailable) {
    return null;
  }

  return {
    issue: 'optimization-guide-missing' as DiagnosticIssue,
    severity: 'warning',
    title: 'Optimization Guide Component Not Downloaded',
    description:
      'Even with flags enabled, the Optimization Guide component needs to download. This can take 1-2 days to appear after enabling flags.',
    fixSteps: [
      'Open chrome://components/',
      'Find "Optimization Guide On Device Model"',
      'Check if version shows "0.0.0.0" (not downloaded)',
      'Click "Check for update" to trigger download',
      'If component is missing entirely, wait 1-2 days and try again',
      'Come back and click "Re-check Status" after download',
    ],
    links: [
      { label: 'Open Components', url: 'chrome://components' },
      {
        label: 'Diagnostics',
        url: 'chrome://on-device-internals',
      },
    ],
  };
}
