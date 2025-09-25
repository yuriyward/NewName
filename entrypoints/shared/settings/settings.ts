/**
 * Application settings persistence and state management
 */
import { storage } from '#imports';
import type {
  CloudSettings,
  DebugLevel,
  DebugSettings,
  FileType,
  InstantBaselineStrategy,
  MetadataToggles,
  Mode,
  PerTypeBehavior,
  Separator,
  SettingsV1,
} from '@/entrypoints/shared/settings/types';
import {
  DEFAULT_SETTINGS,
  isFileType,
  isInstantBaselineStrategy,
} from '@/entrypoints/shared/settings/types';

export type {
  CloudSettings,
  DebugLevel,
  DebugSettings,
  FileType,
  MetadataToggles,
  Mode,
  PerTypeBehavior,
  Separator,
  InstantBaselineStrategy,
  SettingsV1,
};
export { DEFAULT_SETTINGS, isFileType };

const SETTINGS_KEY = 'local:settings.v1';
const HISTORY_MAX = 50;

let cache: SettingsV1 | null = null;
let loadingPromise: Promise<SettingsV1> | null = null;
const listeners = new Set<(settings: SettingsV1) => void>();
let initialized = false;

function coerceSettings(data: unknown): SettingsV1 {
  if (!data || typeof data !== 'object') {
    return DEFAULT_SETTINGS;
  }

  const raw = data as Partial<SettingsV1>;
  const merged: SettingsV1 = {
    ...DEFAULT_SETTINGS,
    ...raw,
    perType: {
      ...DEFAULT_SETTINGS.perType,
      ...(raw.perType ?? {}),
    },
    metadataToggles: {
      ...DEFAULT_SETTINGS.metadataToggles,
      ...(raw.metadataToggles ?? {}),
    },
    cloud: {
      ...DEFAULT_SETTINGS.cloud,
      ...(raw.cloud ?? {}),
      scope: Array.isArray(raw.cloud?.scope)
        ? raw.cloud.scope.filter(isFileType)
        : DEFAULT_SETTINGS.cloud.scope,
    },
    debug: {
      ...DEFAULT_SETTINGS.debug,
      ...(raw.debug ?? {}),
    },
  };

  merged.maxLen = Number.isFinite(merged.maxLen)
    ? Math.min(Math.max(40, Math.trunc(merged.maxLen)), 120)
    : DEFAULT_SETTINGS.maxLen;

  if (!isInstantBaselineStrategy(merged.instantBaselineStrategy)) {
    merged.instantBaselineStrategy = DEFAULT_SETTINGS.instantBaselineStrategy;
  }

  return merged;
}

async function readSettingsFromStorage(): Promise<SettingsV1> {
  const value = await storage.getItem<SettingsV1>(SETTINGS_KEY);
  if (!value) {
    await storage.setItem(SETTINGS_KEY, DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  const settings = coerceSettings(value);
  if (settings.version !== DEFAULT_SETTINGS.version) {
    await storage.setItem(SETTINGS_KEY, settings);
  }
  return settings;
}

async function ensureInitialized(): Promise<SettingsV1> {
  if (cache) return cache;
  if (!loadingPromise) {
    loadingPromise = readSettingsFromStorage().then((settings) => {
      cache = settings;
      loadingPromise = null;
      return settings;
    });
  }
  return loadingPromise;
}

function ensureListener(): void {
  if (initialized) return;
  initialized = true;
  storage.watch<SettingsV1>(SETTINGS_KEY, (newValue) => {
    const next = coerceSettings(newValue);
    cache = next;
    listeners.forEach((listener) => {
      listener(next);
    });
  });
}

export async function getSettings(): Promise<SettingsV1> {
  ensureListener();
  return ensureInitialized();
}

export function getLastKnownSettings(): SettingsV1 {
  return cache ?? DEFAULT_SETTINGS;
}

export async function updateSettings(
  partial: Partial<SettingsV1>,
): Promise<void> {
  const current = await getSettings();
  const next = coerceSettings({ ...current, ...partial });
  cache = next;
  await storage.setItem(SETTINGS_KEY, next);
}

export function subscribeSettings(
  listener: (settings: SettingsV1) => void,
): () => void {
  ensureListener();
  listeners.add(listener);
  if (cache) {
    listener(cache);
  }
  return () => {
    listeners.delete(listener);
  };
}

export function getHistoryMax(): number {
  return HISTORY_MAX;
}
