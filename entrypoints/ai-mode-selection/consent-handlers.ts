/**
 * Consent handling utilities for AI mode selection
 * Provides settings builder functions for different AI processing modes
 */

import type { Settings } from '@/entrypoints/shared/settings/types';
import { createDeclinedConsent, createGrantedConsent } from './constants';

/**
 * Partial settings type for updates
 * Allows updating only specific fields of Settings
 */
export type SettingsUpdate = Partial<Settings>;

/**
 * Builds settings update for local AI processing mode
 * Sets processing mode to 'local' and grants page context consent
 *
 * @param currentSettings - The current application settings
 * @returns Settings update object for local AI mode
 */
export function buildLocalModeSettings(
  currentSettings: Settings,
): SettingsUpdate {
  return {
    processingPreferences: {
      ...currentSettings.processingPreferences,
      global: 'local',
    },
    pageContextConsent: createGrantedConsent(),
  };
}

/**
 * Builds settings update for cloud AI processing mode
 * Sets processing mode to 'cloud', enables cloud processing, and grants consent
 *
 * @param currentSettings - The current application settings
 * @returns Settings update object for cloud AI mode
 */
export function buildCloudModeSettings(
  currentSettings: Settings,
): SettingsUpdate {
  return {
    processingPreferences: {
      ...currentSettings.processingPreferences,
      global: 'cloud',
    },
    cloud: {
      ...currentSettings.cloud,
      enabled: true,
      consentGiven: true,
      consentTimestamp: Date.now(),
    },
    pageContextConsent: createGrantedConsent(),
  };
}

/**
 * Builds settings update for manual/declined mode
 * Sets instant baseline strategy to 'keep-original' and declines page context consent
 * Does NOT change the processing mode - keeps existing global setting
 *
 * @param currentSettings - The current application settings
 * @returns Settings update object for manual mode (consent declined)
 */
export function buildManualModeSettings(
  currentSettings: Settings,
): SettingsUpdate {
  return {
    instantBaselineStrategy: 'keep-original',
    processingPreferences: {
      ...currentSettings.processingPreferences,
      // Keep existing global setting (typically 'auto')
    },
    pageContextConsent: createDeclinedConsent(),
  };
}
