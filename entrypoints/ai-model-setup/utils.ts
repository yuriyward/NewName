import type {
  AiModelState,
  AiModelStatus,
} from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import type { ModelActionConfig, SetupErrorDisplay } from './types';

export function resolveModelAction(
  state: AiModelState,
): ModelActionConfig | null {
  switch (state) {
    case 'available':
    case 'unsupported':
      return null;
    case 'downloadable':
      return { label: 'Grab this model', tone: 'primary' };
    case 'downloading':
      return { label: 'Resume download', tone: 'primary' };
    case 'error':
      return { label: 'Try again', tone: 'primary' };
    case 'unknown':
      return { label: 'Check status', tone: 'secondary' };
    case 'unavailable':
      return { label: 'Check again', tone: 'secondary' };
    default:
      return null;
  }
}

export function resolveSetupErrorMessage(message: string): SetupErrorDisplay {
  if (
    message.includes('Requires a user gesture') ||
    message.includes('user gesture it needs')
  ) {
    return {
      title: 'Chrome is waiting for another click',
      description:
        "Give the model's download button another tap and leave this tab in focus so Chrome keeps the download going.",
    };
  }
  if (
    message.includes('service is not running') ||
    message.includes("hasn't spun up Gemini Nano")
  ) {
    return {
      title: 'Gemini Nano needs a moment to start',
      description:
        'Pop open chrome://on-device-internals, make sure the models show up there, then hop back and retry the download.',
    };
  }
  if (message.includes('Language Detector')) {
    return {
      title: 'Language Detector download is missing',
      description:
        'Start the Language Detector download first—the other models will unlock once that one finishes.',
    };
  }
  if (message.includes('storage') || message.includes('space')) {
    return {
      title: 'Chrome needs a bit more free space',
      description:
        'Free up roughly 10 GB, then come back and hit the download again. Chrome will clear the models automatically if storage gets tight later.',
    };
  }
  return {
    title: 'Model setup ran into a snag',
    description: message,
  };
}

export function isUserActivationIssue(
  error: unknown,
  message: string,
): boolean {
  if (message.includes('Requires a user gesture')) return true;
  if (message.includes('user gesture it needs')) return true;
  if (message.includes('user activation')) return true;
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return true;
  }
  if (error instanceof Error && error.name === 'NotAllowedError') {
    return true;
  }
  return false;
}

export function formatRefreshSummary(lastUpdated: number, now: number): string {
  if (!lastUpdated) {
    return 'Status check pending…';
  }
  const relative = formatRelativeTime(lastUpdated, now);
  return `Statuses refreshed ${relative}.`;
}

export function resolveStaleBadge(
  status: AiModelStatus,
  lastUpdated: number,
  now: number,
): string | null {
  if (status.state === 'downloading') return null;
  const reference = status.lastUpdated || lastUpdated;
  if (!reference) {
    return 'Waiting for first check';
  }
  const ageMs = now - reference;
  if (ageMs <= 0) return null;
  if (ageMs > 3 * 60 * 1000) {
    return `Checked ${formatRelativeTime(reference, now)}`;
  }
  return null;
}

export function formatRelativeTime(timestamp: number, now: number): string {
  const diff = timestamp - now;
  const seconds = Math.round(diff / 1000);
  if (Math.abs(seconds) < 45) {
    return 'just now';
  }
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 45) {
    const value = Math.abs(minutes);
    const unit = value === 1 ? 'minute' : 'minutes';
    return minutes < 0 ? `${value} ${unit} ago` : `in ${value} ${unit}`;
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 22) {
    const value = Math.abs(hours);
    const unit = value === 1 ? 'hour' : 'hours';
    return hours < 0 ? `${value} ${unit} ago` : `in ${value} ${unit}`;
  }
  const days = Math.round(hours / 24);
  const value = Math.abs(days);
  const unit = value === 1 ? 'day' : 'days';
  return days < 0 ? `${value} ${unit} ago` : `in ${value} ${unit}`;
}

export function computeProgressPercent(
  loaded?: number,
  total?: number,
): number | null {
  if (typeof loaded === 'number' && typeof total === 'number' && total > 0) {
    return Math.min(100, Math.max(0, Math.round((loaded / total) * 100)));
  }
  if (typeof loaded === 'number') {
    if (loaded >= 0 && loaded <= 1) {
      return Math.min(100, Math.max(0, Math.round(loaded * 100)));
    }
    return Math.min(100, Math.max(0, Math.round(loaded)));
  }
  return null;
}

export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function detectPreferredLanguage(): string {
  return navigator.language?.split('-')[0]?.toLowerCase() ?? 'en';
}

export function resolveSupportedPromptLanguage(candidate: string): string {
  // Using inline check instead of importing the set to avoid circular deps
  const SUPPORTED = new Set(['en', 'es', 'ja']);
  if (SUPPORTED.has(candidate)) {
    return candidate;
  }
  return 'en';
}
