import type { DiagnosticIssue, DiagnosticResult } from '../diagnostics';

export interface OsSupportContext {
  os: 'windows' | 'macos' | 'linux' | 'chromeos' | 'unknown';
}

export function checkOsSupport(
  context: OsSupportContext,
): DiagnosticResult | null {
  if (context.os !== 'unknown') {
    return null;
  }

  return {
    issue: 'os-unsupported' as DiagnosticIssue,
    severity: 'error',
    title: 'Operating System May Not Be Supported',
    description:
      'Could not detect your operating system. Gemini Nano requires Windows 10+, macOS 13+, Linux, or ChromeOS.',
    fixSteps: [
      'Verify you are running a supported OS',
      'Windows: 10 or 11',
      'macOS: 13+ (Ventura or later)',
      'Linux: Any modern distribution',
      'ChromeOS: Chromebook Plus devices',
    ],
  };
}
