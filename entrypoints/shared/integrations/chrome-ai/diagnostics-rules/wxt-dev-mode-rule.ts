import type { DiagnosticIssue, DiagnosticResult } from '../diagnostics';

export interface WxtDevModeContext {
  allModelsUnavailable: boolean;
  isLikelyWxt: boolean;
}

export function checkWxtDevMode(
  context: WxtDevModeContext,
): DiagnosticResult | null {
  if (!context.allModelsUnavailable || !context.isLikelyWxt) {
    return null;
  }

  return {
    issue: 'fresh-profile-detected' as DiagnosticIssue,
    severity: 'info',
    title: 'Development Mode Detected',
    description:
      'You appear to be running in WXT development mode. WXT creates a separate Chrome profile that requires its own setup.',
    fixSteps: [
      'Enable Chrome flags IN THIS Chrome window (not your regular Chrome)',
      'Open chrome://flags/#prompt-api-for-gemini-nano and set to "Enabled"',
      'Open chrome://flags/#optimization-guide-on-device-model and set to "Enabled BypassPerfRequirement"',
      'Click "Relaunch" and wait for Chrome to restart',
      'Check chrome://components/ for "Optimization Guide On Device Model"',
      'If component is missing, wait 1-2 days for it to download',
    ],
    links: [
      {
        label: 'Open Flags',
        url: 'chrome://flags/#prompt-api-for-gemini-nano',
      },
      {
        label: 'Check Components',
        url: 'chrome://components/',
      },
      {
        label: 'Check Internals',
        url: 'chrome://on-device-internals',
      },
    ],
  };
}
