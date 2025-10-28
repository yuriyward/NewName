/**
 * Integration tests for settings API key encryption
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { isEncrypted } from './crypto';
import { setupMockCrypto } from './crypto.test-helper';
import { getSettings, updateSettings } from './settings';
import {
  resetCachesForTesting,
  resetStorageStateForTesting,
  setStorageAdapterForTesting,
} from './storage-state';

describe('settings API key encryption', () => {
  beforeEach(() => {
    setupMockCrypto();
    fakeBrowser.reset();
    resetCachesForTesting();
    setStorageAdapterForTesting({
      getItem: async (key: string) => {
        const result = await fakeBrowser.storage.local.get([key]);
        return result[key];
      },
      setItem: async (key: string, value: unknown) =>
        await fakeBrowser.storage.local.set({ [key]: value }),
      removeItem: async (key: string) =>
        await fakeBrowser.storage.local.remove(key),
      watch: <T>(
        key: string,
        callback: (newValue: T | null, oldValue: T | null) => void,
      ) => {
        const listener = (
          changes: Record<string, { newValue: unknown; oldValue: unknown }>,
        ) => {
          if (changes[key]) {
            callback(
              changes[key].newValue as T | null,
              changes[key].oldValue as T | null,
            );
          }
        };
        fakeBrowser.storage.local.onChanged.addListener(listener);
        return () =>
          fakeBrowser.storage.local.onChanged.removeListener(listener);
      },
    });
  });

  afterEach(() => {
    resetStorageStateForTesting();
    resetCachesForTesting();
  });

  describe('API key encryption on storage', () => {
    it('should encrypt API key when storing settings', async () => {
      const apiKey = 'test-api-key-12345';

      // Update settings with API key
      await updateSettings({
        cloud: {
          enabled: true,
          scope: [],
          dataMinimize: true,
          textFallbackMode: 'ask',
          model: 'gemini-flash-lite-latest',
          apiKey,
          consentGiven: true,
          consentTimestamp: Date.now(),
        },
      });

      // Check storage directly - should be encrypted
      const stored = await fakeBrowser.storage.local.get('local:settings.v2');
      const storedSettings = stored['local:settings.v2'];

      expect(storedSettings).toBeDefined();
      expect(storedSettings.cloud.apiKey).toBeDefined();
      expect(storedSettings.cloud.apiKey).not.toBe(apiKey); // Should not be plaintext
      expect(isEncrypted(storedSettings.cloud.apiKey)).toBe(true); // Should be encrypted
    });

    it('should decrypt API key when retrieving settings', async () => {
      const apiKey = 'test-api-key-12345';

      // Store encrypted API key
      await updateSettings({
        cloud: {
          enabled: true,
          scope: [],
          dataMinimize: true,
          textFallbackMode: 'ask',
          model: 'gemini-flash-lite-latest',
          apiKey,
          consentGiven: true,
          consentTimestamp: Date.now(),
        },
      });

      // Retrieve settings - should be decrypted
      const settings = await getSettings();

      expect(settings.cloud.apiKey).toBe(apiKey); // Should be decrypted in memory
    });

    it('should handle null API key', async () => {
      await updateSettings({
        cloud: {
          enabled: false,
          scope: [],
          dataMinimize: true,
          textFallbackMode: 'ask',
          model: 'gemini-flash-lite-latest',
          apiKey: null,
          consentGiven: false,
          consentTimestamp: null,
        },
      });

      const settings = await getSettings();
      expect(settings.cloud.apiKey).toBeNull();
    });

    it('should maintain encryption through multiple updates', async () => {
      // Clear any existing settings first
      resetCachesForTesting();

      const apiKey1 = 'first-api-key';
      const apiKey2 = 'second-api-key';

      // First update
      await updateSettings({
        cloud: {
          enabled: true,
          scope: [],
          dataMinimize: true,
          textFallbackMode: 'ask',
          model: 'gemini-flash-lite-latest',
          apiKey: apiKey1,
          consentGiven: true,
          consentTimestamp: Date.now(),
        },
      });

      // Force a fresh load to avoid cache
      resetCachesForTesting();
      let settings = await getSettings();
      expect(settings.cloud.apiKey).toBe(apiKey1);

      // Second update
      await updateSettings({
        cloud: {
          ...settings.cloud,
          apiKey: apiKey2,
        },
      });

      // Force a fresh load to avoid cache
      resetCachesForTesting();
      settings = await getSettings();
      expect(settings.cloud.apiKey).toBe(apiKey2);

      // Verify storage is still encrypted
      const stored = await fakeBrowser.storage.local.get('local:settings.v2');
      const storedSettings = stored['local:settings.v2'];
      expect(isEncrypted(storedSettings.cloud.apiKey)).toBe(true);
    });
  });

  describe('plaintext migration', () => {
    it('should migrate plaintext API key to encrypted format on first load', async () => {
      const plaintextKey = 'plaintext-api-key';

      // Manually insert plaintext key into storage (simulating old data)
      await fakeBrowser.storage.local.set({
        'local:settings.v2': {
          version: 2,
          cloud: {
            enabled: true,
            scope: [],
            dataMinimize: true,
            textFallbackMode: 'ask',
            model: 'gemini-flash-lite-latest',
            apiKey: plaintextKey,
            consentGiven: true,
            consentTimestamp: Date.now(),
          },
          // ... other settings (use defaults)
          mode: 'balanced',
          theme: 'dark',
          language: 'auto',
          separator: 'clean',
          maxLen: 60,
          transliterateAscii: false,
          instantBaselineStrategy: 'original-with-date',
          perType: {
            pdf: { behavior: 'auto' },
            image: { behavior: 'auto' },
            audio: { behavior: 'auto' },
            video: { behavior: 'auto' },
            office: { behavior: 'auto' },
            archive: { behavior: 'auto' },
            data: { behavior: 'auto' },
          },
          metadataToggles: {
            geo: false,
            docDate: true,
            mediaSpecs: true,
            sourceHint: true,
          },
          processingPreferences: {
            global: 'auto',
            usePerTypeOverrides: false,
            text: 'auto',
            pdf: 'auto',
            image: 'auto',
          },
          debug: {
            enabled: false,
            level: 'basic',
          },
          notifyOnKeep: false,
          confirmModal: {
            expandMetadata: false,
            showReasonTags: true,
          },
          confirmToast: {
            autoApplyDelaySeconds: 10,
            showReasonTags: true,
            renameNotifications: {
              instantBaseline: true,
              contextualUpgrade: true,
            },
            renameToastDurationSeconds: 3,
          },
          localization: {
            uiLocale: 'browser',
          },
        },
      });

      // First load should migrate to encrypted
      const settings = await getSettings();
      expect(settings.cloud.apiKey).toBe(plaintextKey);

      // Check storage - should now be encrypted
      const stored = await fakeBrowser.storage.local.get('local:settings.v2');
      const storedSettings = stored['local:settings.v2'];
      expect(storedSettings.cloud.apiKey).not.toBe(plaintextKey);
      expect(isEncrypted(storedSettings.cloud.apiKey)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should clear corrupted API key on decryption failure', async () => {
      // Manually insert corrupted encrypted data with proper prefix
      await fakeBrowser.storage.local.set({
        'local:settings.v2': {
          version: 2,
          cloud: {
            enabled: true,
            scope: [],
            dataMinimize: true,
            textFallbackMode: 'ask',
            model: 'gemini-flash-lite-latest',
            // Corrupted data with correct prefix but invalid base64/ciphertext
            apiKey:
              'enc:v1:dGhpcyBpcyBjb3JydXB0ZWQgZGF0YSB0aGF0IGxvb2tzIGxpa2UgYmFzZTY0',
            consentGiven: true,
            consentTimestamp: Date.now(),
          },
          mode: 'balanced',
          theme: 'dark',
          language: 'auto',
          separator: 'clean',
          maxLen: 60,
          transliterateAscii: false,
          instantBaselineStrategy: 'original-with-date',
          perType: {
            pdf: { behavior: 'auto' },
            image: { behavior: 'auto' },
            audio: { behavior: 'auto' },
            video: { behavior: 'auto' },
            office: { behavior: 'auto' },
            archive: { behavior: 'auto' },
            data: { behavior: 'auto' },
          },
          metadataToggles: {
            geo: false,
            docDate: true,
            mediaSpecs: true,
            sourceHint: true,
          },
          processingPreferences: {
            global: 'auto',
            usePerTypeOverrides: false,
            text: 'auto',
            pdf: 'auto',
            image: 'auto',
          },
          debug: {
            enabled: false,
            level: 'basic',
          },
          notifyOnKeep: false,
          confirmModal: {
            expandMetadata: false,
            showReasonTags: true,
          },
          confirmToast: {
            autoApplyDelaySeconds: 10,
            showReasonTags: true,
            renameNotifications: {
              instantBaseline: true,
              contextualUpgrade: true,
            },
            renameToastDurationSeconds: 3,
          },
          localization: {
            uiLocale: 'browser',
          },
        },
      });

      // Load settings - should clear the corrupted key
      const settings = await getSettings();
      expect(settings.cloud.apiKey).toBeNull();

      // Verify storage was cleared
      const stored = await fakeBrowser.storage.local.get('local:settings.v2');
      const storedSettings = stored['local:settings.v2'];
      expect(storedSettings.cloud.apiKey).toBeNull();
    });
  });
});
