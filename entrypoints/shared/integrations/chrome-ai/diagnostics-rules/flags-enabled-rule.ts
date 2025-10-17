import type { DiagnosticIssue, DiagnosticResult } from '../diagnostics';

export interface FlagsContext {
  allModelsUnavailable: boolean;
}

export function checkFlagsEnabled(
  context: FlagsContext,
): DiagnosticResult | null {
  if (!context.allModelsUnavailable) {
    return null;
  }

  return {
    issue: 'flags-not-enabled' as DiagnosticIssue,
    severity: 'error',
    title: 'Chrome Flags May Not Be Enabled',
    description:
      'All models show unavailable. This typically means required Chrome flags are disabled or the Optimization Guide component is missing.',
    fixSteps: [
      'Open chrome://flags/#prompt-api-for-gemini-nano',
      'Set to "Enabled" and click "Relaunch"',
      'Open chrome://flags/#optimization-guide-on-device-model',
      'Set to "Enabled BypassPerfRequirement" and click "Relaunch"',
      'Wait for Chrome to restart completely',
    ],
    links: [
      {
        label: 'Open Prompt API Flag',
        url: 'chrome://flags/#prompt-api-for-gemini-nano',
      },
      {
        label: 'Open Optimization Guide Flag',
        url: 'chrome://flags/#optimization-guide-on-device-model',
      },
    ],
  };
}
