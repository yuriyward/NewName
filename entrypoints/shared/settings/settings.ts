/**
 * Application settings persistence and state management
 */

import {
  getStorageAdapter,
  getStorageUnwatch,
  registerResetHook,
  setStorageUnwatch,
} from '@/entrypoints/shared/settings/storage-state';
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
  Settings,
} from '@/entrypoints/shared/settings/types';
import {
  DEFAULT_SETTINGS,
  isFileType,
} from '@/entrypoints/shared/settings/types';
import { sanitizeSettings } from '@/entrypoints/shared/settings/validation';

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
  Settings,
};
export { DEFAULT_SETTINGS, isFileType };
const SETTINGS_KEY = 'local:settings.v2';
const HISTORY_MAX = 50;

let cache: Settings | null = null;
let loadingPromise: Promise<Settings> | null = null;
const listeners = new Set<(settings: Settings) => void>();
let initialized = false;

async function readSettingsFromStorage(): Promise<Settings> {
  const storage = getStorageAdapter();
  const currentValue = await storage.getItem<Settings>(SETTINGS_KEY);
  if (currentValue) {
    const sanitized = sanitizeSettings(currentValue);
    if (sanitized.version !== currentValue.version) {
      await storage.setItem(SETTINGS_KEY, sanitized);
    }
    return sanitized;
  }

  await storage.setItem(SETTINGS_KEY, DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

async function ensureInitialized(): Promise<Settings> {
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
  const previousUnwatch = getStorageUnwatch();
  previousUnwatch?.();
  const storage = getStorageAdapter();
  const unwatch = storage.watch<Settings>(SETTINGS_KEY, (newValue) => {
    const next = sanitizeSettings(newValue);
    cache = next;
    listeners.forEach((listener) => {
      listener(next);
    });
  });
  setStorageUnwatch(unwatch);
}

export async function getSettings(): Promise<Settings> {
  ensureListener();
  return ensureInitialized();
}

export function getLastKnownSettings(): Settings {
  return cache ?? DEFAULT_SETTINGS;
}

export async function updateSettings(
  partial: Partial<Settings>,
): Promise<void> {
  const current = await getSettings();
  const next = sanitizeSettings({ ...current, ...partial });
  cache = next;
  await getStorageAdapter().setItem(SETTINGS_KEY, next);
}

export function subscribeSettings(
  listener: (settings: Settings) => void,
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

registerResetHook(() => {
  cache = null;
  loadingPromise = null;
  listeners.clear();
  initialized = false;
});
