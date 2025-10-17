import type { DiagnosticIssue, DiagnosticResult } from '../diagnostics';

export interface ChromeVersionContext {
  chromeMajor: number;
  chromeVersion: string;
}

export function checkChromeVersion(
  context: ChromeVersionContext,
): DiagnosticResult | null {
  if (context.chromeMajor < 138) {
    return {
      issue: 'chrome-version-too-old' as DiagnosticIssue,
      severity: 'error',
      title: `Chrome ${context.chromeMajor} is Too Old`,
      description: `You're using Chrome ${context.chromeVersion}. Gemini Nano requires Chrome 138 or newer.`,
      fixSteps: [
        'Update to Chrome 138+ (stable) or Chrome 140+ (for CPU support)',
        'Go to chrome://settings/help to check for updates',
        'After updating, restart Chrome and return to this page',
      ],
      links: [
        { label: 'Download Chrome', url: 'https://www.google.com/chrome/' },
      ],
    };
  }

  return null;
}
