import type { DiagnosticIssue, DiagnosticResult } from '../diagnostics';

export interface HardwareRequirementsContext {
  allModelsUnavailable: boolean;
  chromeMajor: number;
  hasVersionError: boolean;
}

export function checkHardwareRequirements(
  context: HardwareRequirementsContext,
): DiagnosticResult | null {
  if (
    !context.allModelsUnavailable ||
    context.chromeMajor < 138 ||
    context.hasVersionError
  ) {
    return null;
  }

  return {
    issue: 'hardware-insufficient' as DiagnosticIssue,
    severity: 'warning',
    title: 'Hardware May Not Meet Requirements',
    description:
      'Your hardware might not meet the default requirements. You can try bypassing these checks.',
    fixSteps: [
      'Open chrome://flags/#optimization-guide-on-device-model',
      'Change to "Enabled BypassPerfRequirement"',
      'Restart Chrome',
      'Note: Performance may be slower but should work',
    ],
    links: [
      {
        label: 'Hardware Requirements Guide',
        url: 'https://developer.chrome.com/docs/ai/built-in',
      },
    ],
  };
}
