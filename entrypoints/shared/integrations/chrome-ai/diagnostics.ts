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
  const chrome = getChromeVersion();
  const { os } = getPlatform();
  const profileInfo = detectFreshOrDevProfile();

  const allModelsUnavailable = Object.values(statuses).every(
    (status) => status.state === 'unavailable' || status.state === 'error',
  );

  // Log individual model availability details
  Object.entries(statuses).forEach(([id, status]) => {
    if (status.state === 'unavailable' && status.detail) {
      debugLogger.log('[Diagnostics] Model unavailable', {
        id,
        detail: status.detail,
      });
    }
  });

  // Import and run diagnostic rules
  const { checkWxtDevMode } = await import(
    './diagnostics-rules/wxt-dev-mode-rule'
  );
  const { checkChromeVersion } = await import(
    './diagnostics-rules/chrome-version-rule'
  );
  const { checkFlagsEnabled } = await import(
    './diagnostics-rules/flags-enabled-rule'
  );
  const { checkOptimizationGuide } = await import(
    './diagnostics-rules/optimization-guide-rule'
  );
  const { checkOsSupport } = await import(
    './diagnostics-rules/os-support-rule'
  );
  const { checkHardwareRequirements } = await import(
    './diagnostics-rules/hardware-requirements-rule'
  );

  const issues: DiagnosticResult[] = [];

  // Run all diagnostic rules in order
  const wxtIssue = checkWxtDevMode({
    allModelsUnavailable,
    isLikelyWxt: profileInfo.isLikelyWxt,
  });
  if (wxtIssue) issues.push(wxtIssue);

  const versionIssue = checkChromeVersion({
    chromeMajor: chrome.major,
    chromeVersion: chrome.version,
  });
  if (versionIssue) issues.push(versionIssue);

  const flagsIssue = checkFlagsEnabled({ allModelsUnavailable });
  if (flagsIssue) issues.push(flagsIssue);

  const guideIssue = checkOptimizationGuide({ allModelsUnavailable });
  if (guideIssue) issues.push(guideIssue);

  const osIssue = checkOsSupport({ os });
  if (osIssue) issues.push(osIssue);

  const hardwareIssue = checkHardwareRequirements({
    allModelsUnavailable,
    chromeMajor: chrome.major,
    hasVersionError: Boolean(versionIssue),
  });
  if (hardwareIssue) issues.push(hardwareIssue);

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
