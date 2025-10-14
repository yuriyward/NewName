/**
 * Diagnostic utilities for Chrome built-in AI troubleshooting.
 * Identifies specific failure modes and provides targeted fix instructions.
 */

import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type { AiModelStatusMap } from './model-status';

export type DiagnosticIssue =
  | 'chrome-version-too-old'
  | 'chrome-channel-wrong'
  | 'flags-not-enabled'
  | 'optimization-guide-missing'
  | 'model-not-downloaded'
  | 'hardware-insufficient'
  | 'os-unsupported'
  | 'storage-insufficient'
  | 'fresh-profile-detected'
  | 'unknown';

export interface DiagnosticResult {
  issue: DiagnosticIssue;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  fixSteps: string[];
  links?: Array<{ label: string; url: string }>;
}

export interface SystemDiagnostics {
  chromeVersion: string;
  chromeMajor: number;
  platform: string;
  issues: DiagnosticResult[];
  allModelsUnavailable: boolean;
}

/**
 * Get Chrome version information.
 */
export function getChromeVersion(): {
  version: string;
  major: number;
  channel: 'stable' | 'beta' | 'dev' | 'canary' | 'unknown';
} {
  const userAgent = navigator.userAgent;
  const versionMatch = userAgent.match(/Chrome\/([\d.]+)/);

  if (!versionMatch) {
    return { version: 'unknown', major: 0, channel: 'unknown' };
  }

  const version = versionMatch[1];
  const major = Number.parseInt(version.split('.')[0], 10);

  // Detect channel from user agent
  let channel: 'stable' | 'beta' | 'dev' | 'canary' | 'unknown' = 'stable';
  if (userAgent.includes('Chrome/') && userAgent.includes('Edg/')) {
    channel = 'unknown'; // Edge
  } else if (userAgent.toLowerCase().includes('canary')) {
    channel = 'canary';
  } else if (userAgent.toLowerCase().includes('dev')) {
    channel = 'dev';
  } else if (userAgent.toLowerCase().includes('beta')) {
    channel = 'beta';
  }

  return { version, major, channel };
}

/**
 * Get platform information.
 */
export function getPlatform(): {
  os: 'windows' | 'macos' | 'linux' | 'chromeos' | 'unknown';
  osVersion: string;
} {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform.toLowerCase();

  let os: 'windows' | 'macos' | 'linux' | 'chromeos' | 'unknown' = 'unknown';

  if (platform.includes('win')) {
    os = 'windows';
  } else if (platform.includes('mac')) {
    os = 'macos';
  } else if (platform.includes('linux')) {
    os = 'linux';
  } else if (userAgent.includes('CrOS')) {
    os = 'chromeos';
  }

  return { os, osVersion: userAgent };
}

/**
 * Detect if running in WXT development mode or a fresh Chrome profile.
 * This is a heuristic based on common WXT patterns.
 */
export function detectFreshOrDevProfile(): {
  isFreshProfile: boolean;
  isLikelyWxt: boolean;
  reason?: string;
} {
  try {
    // Check if extension URL contains common WXT patterns
    const globalScope = globalThis as typeof globalThis & {
      chrome?: {
        runtime?: {
          id?: string;
        };
      };
    };

    const extensionId = globalScope.chrome?.runtime?.id;
    if (!extensionId) {
      return { isFreshProfile: false, isLikelyWxt: false };
    }

    // Heuristic: Check for temporary extension ID patterns
    // WXT often uses IDs starting with specific patterns in dev mode
    const isTempId =
      extensionId.length === 32 && /^[a-p]{32}$/.test(extensionId);

    return {
      isFreshProfile: false, // We can't reliably detect fresh profile from extension context
      isLikelyWxt: isTempId,
      reason: isTempId
        ? 'Temporary extension ID detected (common in development)'
        : undefined,
    };
  } catch (error) {
    debugLogger.log('[Diagnostics] Profile detection error', { error });
    return { isFreshProfile: false, isLikelyWxt: false };
  }
}

/**
 * Run comprehensive diagnostics and return specific issues.
 */
export async function runDiagnostics(
  statuses: AiModelStatusMap,
): Promise<SystemDiagnostics> {
  const issues: DiagnosticResult[] = [];
  const chrome = getChromeVersion();
  const { os } = getPlatform();
  const profileInfo = detectFreshOrDevProfile();

  const allModelsUnavailable = Object.values(statuses).every(
    (status) => status.state === 'unavailable' || status.state === 'error',
  );

  // Check 0: WXT development mode / fresh profile (if all models unavailable)
  if (allModelsUnavailable && profileInfo.isLikelyWxt) {
    issues.push({
      issue: 'fresh-profile-detected',
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
    });
  }

  // Check 1: Chrome version
  if (chrome.major < 138) {
    issues.push({
      issue: 'chrome-version-too-old',
      severity: 'error',
      title: `Chrome ${chrome.major} is Too Old`,
      description: `You're using Chrome ${chrome.version}. Gemini Nano requires Chrome 138 or newer.`,
      fixSteps: [
        'Update to Chrome 138+ (stable) or Chrome 140+ (for CPU support)',
        'Go to chrome://settings/help to check for updates',
        'After updating, restart Chrome and return to this page',
      ],
      links: [
        { label: 'Download Chrome', url: 'https://www.google.com/chrome/' },
      ],
    });
  }

  // Check 2: All models unavailable suggests flags or component missing
  if (allModelsUnavailable) {
    // Sub-check: Likely flags not enabled
    issues.push({
      issue: 'flags-not-enabled',
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
    });

    // Sub-check: Optimization Guide component
    issues.push({
      issue: 'optimization-guide-missing',
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
    });
  }

  // Check 3: OS support
  if (os === 'unknown') {
    issues.push({
      issue: 'os-unsupported',
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
    });
  }

  // Check 4: Individual model availability details
  Object.entries(statuses).forEach(([id, status]) => {
    if (status.state === 'unavailable' && status.detail) {
      debugLogger.log('[Diagnostics] Model unavailable', {
        id,
        detail: status.detail,
      });
    }
  });

  // Check 5: Hardware requirements (if models show unavailable but flags are likely enabled)
  if (
    allModelsUnavailable &&
    chrome.major >= 138 &&
    !issues.find((i) => i.issue === 'chrome-version-too-old')
  ) {
    issues.push({
      issue: 'hardware-insufficient',
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
    });
  }

  return {
    chromeVersion: chrome.version,
    chromeMajor: chrome.major,
    platform: os,
    issues,
    allModelsUnavailable,
  };
}

/**
 * Get a summary message based on diagnostic results.
 */
export function getDiagnosticSummary(diagnostics: SystemDiagnostics): string {
  if (diagnostics.issues.length === 0) {
    return 'All checks passed. Models should be ready to download.';
  }

  const errors = diagnostics.issues.filter((i) => i.severity === 'error');
  const warnings = diagnostics.issues.filter((i) => i.severity === 'warning');

  if (errors.length > 0) {
    return `Found ${errors.length} critical ${errors.length === 1 ? 'issue' : 'issues'} that must be fixed.`;
  }

  if (warnings.length > 0) {
    return `Found ${warnings.length} potential ${warnings.length === 1 ? 'issue' : 'issues'} to investigate.`;
  }

  return 'System checks completed.';
}
