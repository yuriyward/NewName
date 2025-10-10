/**
 * Settings validation and sanitization functions
 */
import type {
  CloudSettings,
  ConfirmModalDefaults,
  ConfirmToastSettings,
  DebugLevel,
  DebugSettings,
  FileType,
  LocalizationSettings,
  MetadataToggles,
  Mode,
  PerTypeBehavior,
  Separator,
  Settings,
  Theme,
} from '@/entrypoints/shared/settings/types';
import {
  DEFAULT_SETTINGS,
  isFileType,
  isInstantBaselineStrategy,
  isUiLocale,
} from '@/entrypoints/shared/settings/types';

type Language = Settings['language'];

type PartialPerType = Partial<Record<FileType, Partial<PerTypeBehavior>>>;

type FallbackSettings = Partial<Settings>;

export function isMode(value: unknown): value is Mode {
  return (
    value === 'balanced' ||
    value === 'silent' ||
    value === 'careful' ||
    value === 'custom'
  );
}

export function isSeparator(value: unknown): value is Separator {
  return value === 'clean' || value === 'kebab' || value === 'snake';
}

export function isDebugLevel(value: unknown): value is DebugLevel {
  return value === 'basic' || value === 'detailed' || value === 'verbose';
}

export function isPerTypeBehavior(value: unknown): value is PerTypeBehavior {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Partial<PerTypeBehavior>).behavior !== undefined &&
    ['auto', 'confirm', 'off'].includes(
      (value as Partial<PerTypeBehavior>).behavior as string,
    )
  );
}

export function isLanguage(value: unknown): value is Language {
  return (
    value === 'browser' ||
    value === 'auto' ||
    value === 'pl' ||
    value === 'en' ||
    value === 'uk'
  );
}

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

export function sanitizePerType(
  input: PartialPerType | undefined,
): Settings['perType'] {
  const result: Settings['perType'] = { ...DEFAULT_SETTINGS.perType };
  if (!input || typeof input !== 'object') {
    return result;
  }
  for (const [key, value] of Object.entries(input)) {
    if (!isFileType(key)) continue;
    if (!isPerTypeBehavior(value)) continue;
    result[key] = { behavior: value.behavior };
  }
  return result;
}

export function sanitizeMetadataToggles(
  input: Partial<MetadataToggles> | undefined,
): Settings['metadataToggles'] {
  const defaults = DEFAULT_SETTINGS.metadataToggles;
  return {
    geo: typeof input?.geo === 'boolean' ? input.geo : defaults.geo,
    docDate:
      typeof input?.docDate === 'boolean' ? input.docDate : defaults.docDate,
    mediaSpecs:
      typeof input?.mediaSpecs === 'boolean'
        ? input.mediaSpecs
        : defaults.mediaSpecs,
    sourceHint:
      typeof input?.sourceHint === 'boolean'
        ? input.sourceHint
        : defaults.sourceHint,
  };
}

export function sanitizeCloudSettings(
  input: Partial<CloudSettings> | undefined,
): Settings['cloud'] {
  const defaults = DEFAULT_SETTINGS.cloud;
  const scope = Array.isArray(input?.scope)
    ? Array.from(new Set(input.scope.filter(isFileType)))
    : defaults.scope;
  return {
    enabled:
      typeof input?.enabled === 'boolean' ? input.enabled : defaults.enabled,
    scope,
    dataMinimize:
      typeof input?.dataMinimize === 'boolean'
        ? input.dataMinimize
        : defaults.dataMinimize,
  };
}

export function sanitizeDebugSettings(
  input: Partial<DebugSettings> | undefined,
): Settings['debug'] {
  const defaults = DEFAULT_SETTINGS.debug;
  const level = isDebugLevel(input?.level) ? input.level : defaults.level;
  return {
    enabled:
      typeof input?.enabled === 'boolean' ? input.enabled : defaults.enabled,
    level,
  };
}

export function sanitizeConfirmModal(
  input: Partial<ConfirmModalDefaults> | undefined,
): Settings['confirmModal'] {
  const defaults = DEFAULT_SETTINGS.confirmModal;
  return {
    expandMetadata:
      typeof input?.expandMetadata === 'boolean'
        ? input.expandMetadata
        : defaults.expandMetadata,
    showReasonTags:
      typeof input?.showReasonTags === 'boolean'
        ? input.showReasonTags
        : defaults.showReasonTags,
  };
}

export function sanitizeConfirmToast(
  input: Partial<ConfirmToastSettings> | undefined,
): Settings['confirmToast'] {
  const defaults = DEFAULT_SETTINGS.confirmToast;
  const rawDelay =
    typeof input?.autoApplyDelaySeconds === 'number'
      ? input.autoApplyDelaySeconds
      : Number(input?.autoApplyDelaySeconds);
  const normalizedDelay = Number.isFinite(rawDelay)
    ? Math.round(rawDelay as number)
    : defaults.autoApplyDelaySeconds;
  const clampedDelay =
    normalizedDelay >= 5 && normalizedDelay <= 30
      ? normalizedDelay
      : defaults.autoApplyDelaySeconds;

  return {
    autoApplyDelaySeconds: clampedDelay,
    showReasonTags:
      typeof input?.showReasonTags === 'boolean'
        ? input.showReasonTags
        : defaults.showReasonTags,
    showRenameNotifications:
      typeof input?.showRenameNotifications === 'boolean'
        ? input.showRenameNotifications
        : defaults.showRenameNotifications,
  };
}

export function sanitizeLocalization(
  input: Partial<LocalizationSettings> | undefined,
): Settings['localization'] {
  const defaults = DEFAULT_SETTINGS.localization;
  const locale = isUiLocale(input?.uiLocale)
    ? input.uiLocale
    : defaults.uiLocale;
  return {
    uiLocale: locale,
  };
}

export function sanitizeSettings(data: unknown): Settings {
  if (!data || typeof data !== 'object') {
    return DEFAULT_SETTINGS;
  }

  const raw = data as FallbackSettings;

  const mode = isMode(raw.mode) ? raw.mode : DEFAULT_SETTINGS.mode;
  const theme = isTheme(raw.theme) ? raw.theme : DEFAULT_SETTINGS.theme;
  const separator = isSeparator(raw.separator)
    ? raw.separator
    : DEFAULT_SETTINGS.separator;
  const maxLen = Number.isFinite(raw.maxLen)
    ? Math.min(Math.max(40, Math.trunc(raw.maxLen as number)), 120)
    : DEFAULT_SETTINGS.maxLen;
  const transliterateAscii =
    typeof raw.transliterateAscii === 'boolean'
      ? raw.transliterateAscii
      : DEFAULT_SETTINGS.transliterateAscii;
  const instantBaselineStrategy = isInstantBaselineStrategy(
    raw.instantBaselineStrategy,
  )
    ? raw.instantBaselineStrategy
    : DEFAULT_SETTINGS.instantBaselineStrategy;
  const language = isLanguage(raw.language)
    ? raw.language
    : DEFAULT_SETTINGS.language;
  const notifyOnKeep =
    typeof raw.notifyOnKeep === 'boolean'
      ? raw.notifyOnKeep
      : DEFAULT_SETTINGS.notifyOnKeep;

  return {
    version: 2,
    mode,
    theme,
    language,
    separator,
    maxLen,
    transliterateAscii,
    instantBaselineStrategy,
    perType: sanitizePerType(raw.perType),
    metadataToggles: sanitizeMetadataToggles(raw.metadataToggles),
    cloud: sanitizeCloudSettings(raw.cloud),
    debug: sanitizeDebugSettings(raw.debug),
    notifyOnKeep,
    confirmModal: sanitizeConfirmModal(raw.confirmModal),
    confirmToast: sanitizeConfirmToast(raw.confirmToast),
    localization: sanitizeLocalization(raw.localization),
  };
}
