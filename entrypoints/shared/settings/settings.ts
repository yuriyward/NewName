/**
 * Application settings persistence and state management
 */

import {
  decryptApiKey,
  encryptApiKey,
  isEncrypted,
} from '@/entrypoints/shared/settings/crypto';
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

/**
 * Decrypt the API key in settings if it's encrypted
 * Also handles migration of plaintext keys to encrypted format
 */
async function decryptSettingsApiKey(settings: Settings): Promise<Settings> {
  if (!settings.cloud.apiKey) {
    return settings;
  }

  try {
    // Check if the API key is encrypted
    if (isEncrypted(settings.cloud.apiKey)) {
      // Decrypt it
      const decryptedKey = await decryptApiKey(settings.cloud.apiKey);
      return {
        ...settings,
        cloud: {
          ...settings.cloud,
          apiKey: decryptedKey,
        },
      };
    }

    // Migration: If it's plaintext, encrypt it and save back to storage
    // Note: This migration happens automatically and silently
    const encryptedKey = await encryptApiKey(settings.cloud.apiKey);
    const migratedSettings = {
      ...settings,
      cloud: {
        ...settings.cloud,
        apiKey: encryptedKey,
      },
    };

    // Save the encrypted version back to storage
    const storage = getStorageAdapter();
    await storage.setItem(SETTINGS_KEY, migratedSettings);

    // Return the decrypted version for use
    return settings;
  } catch (error) {
    // On decryption failure, clear the key to prevent repeated errors
    // Only log in non-test environments
    if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
      console.error('Failed to decrypt API key:', error);
    }
    const clearedSettings = {
      ...settings,
      cloud: {
        ...settings.cloud,
        apiKey: null,
      },
    };
    const storage = getStorageAdapter();
    await storage.setItem(SETTINGS_KEY, clearedSettings);
    return clearedSettings;
  }
}

async function readSettingsFromStorage(): Promise<Settings> {
  const storage = getStorageAdapter();
  const currentValue = await storage.getItem<Settings>(SETTINGS_KEY);
  if (currentValue) {
    const sanitized = sanitizeSettings(currentValue);
    if (sanitized.version !== currentValue.version) {
      await storage.setItem(SETTINGS_KEY, sanitized);
    }
    // Decrypt API key if present
    return decryptSettingsApiKey(sanitized);
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
    // Decrypt API key asynchronously before notifying listeners
    decryptSettingsApiKey(next)
      .then((decrypted) => {
        cache = decrypted;
        listeners.forEach((listener) => {
          listener(decrypted);
        });
      })
      .catch((error) => {
        // Only log in non-test environments
        if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
          console.error('Failed to decrypt API key in watch handler:', error);
        }
        cache = next;
        listeners.forEach((listener) => {
          listener(next);
        });
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

/**
 * Encrypt the API key in settings before storing
 */
async function encryptSettingsApiKey(settings: Settings): Promise<Settings> {
  if (!settings.cloud.apiKey) {
    return settings;
  }

  try {
    // Only encrypt if it's not already encrypted
    if (!isEncrypted(settings.cloud.apiKey)) {
      const encryptedKey = await encryptApiKey(settings.cloud.apiKey);
      return {
        ...settings,
        cloud: {
          ...settings.cloud,
          apiKey: encryptedKey,
        },
      };
    }
    return settings;
  } catch (error) {
    console.error('Failed to encrypt API key:', error);
    throw new Error('Failed to encrypt API key for storage');
  }
}

export async function updateSettings(
  partial: Partial<Settings>,
): Promise<void> {
  const current = await getSettings();
  const next = sanitizeSettings({ ...current, ...partial });
  cache = next;

  // Encrypt API key before storing
  const encrypted = await encryptSettingsApiKey(next);
  await getStorageAdapter().setItem(SETTINGS_KEY, encrypted);
}

/**
 * Atomically disable cloud AI and reset all processing modes to 'local'.
 * This ensures both updates happen in a single storage write, preventing
 * race conditions or inconsistent state.
 */
export async function disableCloudAndResetProcessingModes(): Promise<void> {
  const current = await getSettings();
  const next = sanitizeSettings({
    ...current,
    cloud: {
      ...current.cloud,
      enabled: false,
    },
    processingPreferences: {
      ...current.processingPreferences,
      global: 'local',
      text: 'local',
      pdf: 'local',
      image: 'local',
    },
  });
  cache = next;

  // Encrypt API key before storing
  const encrypted = await encryptSettingsApiKey(next);
  await getStorageAdapter().setItem(SETTINGS_KEY, encrypted);
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
