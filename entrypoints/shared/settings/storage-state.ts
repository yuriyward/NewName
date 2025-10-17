/**
 * Storage adapter state management for settings module
 *
 * This module provides a testing override mechanism for the storage adapter.
 * In production, it simply re-exports WXT's storage API.
 * In tests, it allows mocking storage behavior without complex setup.
 */

import { storage as wxtStorageApi } from '#imports';

type StorageAdapter = typeof wxtStorageApi;
export type StorageOverride = Pick<
  StorageAdapter,
  'getItem' | 'setItem' | 'removeItem' | 'watch'
>;

let storageAdapter: StorageAdapter = wxtStorageApi;
let storageUnwatch: (() => void) | null = null;
const resetHooks = new Set<() => void>();

export function getStorageAdapter(): StorageAdapter {
  return storageAdapter;
}

export function setStorageUnwatch(unwatch: (() => void) | null): void {
  storageUnwatch = unwatch;
}

export function getStorageUnwatch(): (() => void) | null {
  return storageUnwatch;
}

export function setStorageAdapterForTesting(
  override: StorageOverride | null,
): void {
  storageAdapter = override ? { ...wxtStorageApi, ...override } : wxtStorageApi;
}

export function registerResetHook(hook: () => void): void {
  resetHooks.add(hook);
}

export function resetStorageStateForTesting(): void {
  storageUnwatch?.();
  storageUnwatch = null;
  storageAdapter = wxtStorageApi;
  runResetHooks();
}

export function resetCachesForTesting(): void {
  runResetHooks();
}

function runResetHooks(): void {
  resetHooks.forEach((hook) => {
    hook();
  });
}
