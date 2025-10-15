/**
 * Shared helpers for normalising and resolving language preferences
 * when interacting with Chrome's built-in AI surfaces.
 */
import type { Settings } from '@/entrypoints/shared/settings/types';

const DEFAULT_LANGUAGE = 'en';

type LanguagePreferenceSource =
  | Pick<Settings, 'language'>
  | { languagePreference: Settings['language'] };

export function getUserLanguagePreference(
  settings: LanguagePreferenceSource,
): Settings['language'] {
  return 'language' in settings
    ? settings.language
    : settings.languagePreference;
}

export function detectBrowserLanguage(): string {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LANGUAGE;
  }
  const primary =
    navigator.languages?.find(Boolean) ??
    navigator.language ??
    DEFAULT_LANGUAGE;
  return normalizeLanguageCode(primary);
}

export function resolveSupportedLanguage(
  candidate: string | undefined,
  supportedSet: Set<string>,
): string {
  const normalised = normalizeLanguageCode(candidate);
  if (supportedSet.has(normalised)) {
    return normalised;
  }
  if (supportedSet.has(DEFAULT_LANGUAGE)) {
    return DEFAULT_LANGUAGE;
  }
  const iterator = supportedSet.values().next();
  return iterator.done ? DEFAULT_LANGUAGE : iterator.value;
}

export function normalizeLanguageCode(lang: string | undefined): string {
  if (!lang) {
    return DEFAULT_LANGUAGE;
  }
  const trimmed = lang.trim();
  if (trimmed.length === 0) {
    return DEFAULT_LANGUAGE;
  }
  const lower = trimmed.toLowerCase();
  const [primary] = lower.split(/[-_]/);
  return primary || DEFAULT_LANGUAGE;
}
