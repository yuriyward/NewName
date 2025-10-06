/**
 * Test utilities for settings module
 */
import {
  resetCachesForTesting,
  resetStorageStateForTesting,
  type StorageOverride,
  setStorageAdapterForTesting,
} from '@/entrypoints/shared/settings/storage-state';

/**
 * Applies a storage override for tests and clears cached settings state.
 */
export function applySettingsStorageOverrideForTesting(
  override: StorageOverride | null,
): void {
  setStorageAdapterForTesting(override);
  resetCachesForTesting();
}

/**
 * Restores the default storage adapter and clears cached settings state.
 */
export function resetSettingsStateForTesting(): void {
  resetStorageStateForTesting();
}
