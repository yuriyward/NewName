import {
  DEFAULT_SETTINGS,
  type Settings,
} from '@/entrypoints/shared/settings/settings';

function mergePerType(
  overrides: Partial<Settings['perType']> | undefined,
): Settings['perType'] {
  return {
    ...DEFAULT_SETTINGS.perType,
    ...(overrides ?? {}),
  };
}

function mergeMetadataToggles(
  overrides: Partial<Settings['metadataToggles']> | undefined,
): Settings['metadataToggles'] {
  return {
    ...DEFAULT_SETTINGS.metadataToggles,
    ...(overrides ?? {}),
  };
}

function mergeCloud(
  overrides: Partial<Settings['cloud']> | undefined,
): Settings['cloud'] {
  return {
    ...DEFAULT_SETTINGS.cloud,
    ...(overrides ?? {}),
    scope: overrides?.scope
      ? Array.from(overrides.scope)
      : DEFAULT_SETTINGS.cloud.scope,
  };
}

function mergeDebug(
  overrides: Partial<Settings['debug']> | undefined,
): Settings['debug'] {
  return {
    ...DEFAULT_SETTINGS.debug,
    ...(overrides ?? {}),
  };
}

function mergeConfirmModal(
  overrides: Partial<Settings['confirmModal']> | undefined,
): Settings['confirmModal'] {
  return {
    ...DEFAULT_SETTINGS.confirmModal,
    ...(overrides ?? {}),
  };
}

function mergeLocalization(
  overrides: Partial<Settings['localization']> | undefined,
): Settings['localization'] {
  return {
    ...DEFAULT_SETTINGS.localization,
    ...(overrides ?? {}),
  };
}

export function createTestSettings(
  overrides: Partial<Settings> = {},
): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...overrides,
    perType: mergePerType(overrides.perType),
    metadataToggles: mergeMetadataToggles(overrides.metadataToggles),
    cloud: mergeCloud(overrides.cloud),
    debug: mergeDebug(overrides.debug),
    confirmModal: mergeConfirmModal(overrides.confirmModal),
    localization: mergeLocalization(overrides.localization),
  };
}
