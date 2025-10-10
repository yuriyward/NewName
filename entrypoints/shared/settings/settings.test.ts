import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  getLastKnownSettings,
  getSettings,
  subscribeSettings,
} from './settings';
import {
  applySettingsStorageOverrideForTesting,
  resetSettingsStateForTesting,
} from './testing';

const storageState = new Map<string, unknown>();
const watchCallbacks = new Map<string, Array<(value: unknown) => void>>();

const getItemMock = vi.fn(async (key: string) => storageState.get(key));
const setItemMock = vi.fn(async (key: string, value: unknown) => {
  storageState.set(key, value);
});
const removeItemMock = vi.fn(async (key: string) => {
  storageState.delete(key);
});
const watchMock = vi.fn(
  <T>(key: string, callback: (value: T | null) => void) => {
    const entry = callback as (value: unknown) => void;
    const existing = watchCallbacks.get(key) ?? [];
    existing.push(entry);
    watchCallbacks.set(key, existing);
    return () => {
      const list = watchCallbacks.get(key);
      if (!list) return;
      const index = list.indexOf(entry);
      if (index !== -1) {
        list.splice(index, 1);
        if (list.length === 0) {
          watchCallbacks.delete(key);
        }
      }
    };
  },
);

function triggerWatch(key: string, value: unknown) {
  const callbacks = watchCallbacks.get(key);
  callbacks?.forEach((callback) => {
    callback(value);
  });
}

function installStorageOverride() {
  applySettingsStorageOverrideForTesting({
    getItem: getItemMock,
    setItem: setItemMock,
    removeItem: removeItemMock,
    watch: watchMock,
  });
}

beforeEach(() => {
  storageState.clear();
  watchCallbacks.clear();
  getItemMock.mockClear();
  setItemMock.mockClear();
  removeItemMock.mockClear();
  watchMock.mockClear();
  resetSettingsStateForTesting();
  installStorageOverride();
});

afterEach(() => {
  resetSettingsStateForTesting();
});

describe('settings persistence', () => {
  it('initializes defaults when no settings exist', async () => {
    const settings = await getSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(setItemMock).toHaveBeenCalledWith(
      'local:settings.v2',
      DEFAULT_SETTINGS,
    );
    expect(removeItemMock).not.toHaveBeenCalled();
  });

  it('sanitizes invalid persisted values back to safe defaults', async () => {
    storageState.set('local:settings.v2', {
      version: 2,
      mode: 'invalid-mode',
      language: 'de',
      separator: 'dash',
      maxLen: 'not-a-number',
      transliterateAscii: 'yes',
      instantBaselineStrategy: 'unsupported',
      perType: {
        pdf: { behavior: 'maybe' },
        audio: { behavior: 'confirm' },
      },
      metadataToggles: {
        geo: 'false',
        docDate: null,
        mediaSpecs: undefined,
        sourceHint: true,
      },
      cloud: {
        enabled: 'true',
        scope: ['pdf', 'video', 'bogus'],
        dataMinimize: 'false',
      },
      debug: { enabled: 'true', level: 'super' },
      notifyOnKeep: 'nope',
      confirmModal: { expandMetadata: 'yes', showReasonTags: 'no' },
      confirmToast: {
        autoApplyDelaySeconds: 'fast',
        showReasonTags: null,
        showRenameNotifications: 'nope',
      },
      localization: { uiLocale: 'es' },
    });

    const settings = await getSettings();

    expect(settings.version).toBe(2);
    expect(settings.mode).toBe(DEFAULT_SETTINGS.mode);
    expect(settings.language).toBe(DEFAULT_SETTINGS.language);
    expect(settings.separator).toBe(DEFAULT_SETTINGS.separator);
    expect(settings.maxLen).toBe(DEFAULT_SETTINGS.maxLen);
    expect(settings.transliterateAscii).toBe(false);
    expect(settings.instantBaselineStrategy).toBe(
      DEFAULT_SETTINGS.instantBaselineStrategy,
    );
    expect(settings.perType.audio.behavior).toBe('confirm');
    expect(settings.perType.pdf.behavior).toBe(
      DEFAULT_SETTINGS.perType.pdf.behavior,
    );
    expect(settings.metadataToggles.geo).toBe(
      DEFAULT_SETTINGS.metadataToggles.geo,
    );
    expect(settings.metadataToggles.sourceHint).toBe(true);
    expect(settings.cloud.enabled).toBe(DEFAULT_SETTINGS.cloud.enabled);
    expect(settings.cloud.scope).toEqual(['pdf', 'video']);
    expect(settings.cloud.dataMinimize).toBe(
      DEFAULT_SETTINGS.cloud.dataMinimize,
    );
    expect(settings.debug.enabled).toBe(DEFAULT_SETTINGS.debug.enabled);
    expect(settings.debug.level).toBe(DEFAULT_SETTINGS.debug.level);
    expect(settings.notifyOnKeep).toBe(DEFAULT_SETTINGS.notifyOnKeep);
    expect(settings.confirmModal).toEqual(DEFAULT_SETTINGS.confirmModal);
    expect(settings.confirmToast).toEqual(DEFAULT_SETTINGS.confirmToast);
    expect(settings.localization.uiLocale).toBe(
      DEFAULT_SETTINGS.localization.uiLocale,
    );
  });

  it('updates subscribers when storage watch emits new values', async () => {
    const current = await getSettings();
    expect(current).toEqual(getLastKnownSettings());

    const updates: number[] = [];
    const unsubscribe = subscribeSettings((next) => {
      updates.push(next.maxLen);
    });

    expect(updates).toEqual([DEFAULT_SETTINGS.maxLen]);

    triggerWatch('local:settings.v2', {
      ...current,
      maxLen: 80,
    });

    expect(updates).toEqual([DEFAULT_SETTINGS.maxLen, 80]);
    expect(getLastKnownSettings().maxLen).toBe(80);

    unsubscribe();
  });
});
