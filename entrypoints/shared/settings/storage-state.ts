/**
 * Internal storage adapter state management for testing
 */
import { storage as storageApi } from '#imports';

type StorageAdapter = typeof storageApi;
export type StorageOverride = Pick<
  StorageAdapter,
  'getItem' | 'setItem' | 'removeItem' | 'watch'
>;

let storageAdapter: StorageAdapter = storageApi;
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
  storageAdapter = override ? { ...storageApi, ...override } : storageApi;
}

export function registerResetHook(hook: () => void): void {
  resetHooks.add(hook);
}

export function resetStorageStateForTesting(): void {
  storageUnwatch?.();
  storageUnwatch = null;
  storageAdapter = storageApi;
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
