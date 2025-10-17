import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  getStorageAdapter,
  registerResetHook,
} from '@/entrypoints/shared/settings/storage-state';
import { recordAiModelStatusTransition } from '../telemetry';
import {
  AI_MODEL_IDS,
  type AiModelStatus,
  type AiModelStatusMap,
} from './status-types';
import { cloneStatusMap, ensureStatusShape } from './status-utils';

const STORAGE_KEY = 'session:ai.models.status';

let statusCache: AiModelStatusMap | null = null;
let storageUnwatch: (() => void) | null = null;
const listeners = new Set<(status: AiModelStatusMap) => void>();

registerResetHook(() => {
  statusCache = null;
  listeners.clear();
  storageUnwatch?.();
  storageUnwatch = null;
});

export async function ensureCacheLoaded(): Promise<AiModelStatusMap> {
  if (statusCache) {
    ensureStorageWatch();
    return statusCache;
  }

  try {
    const stored =
      await getStorageAdapter().getItem<Partial<AiModelStatusMap> | null>(
        STORAGE_KEY,
      );
    statusCache = ensureStatusShape(stored ?? undefined);
  } catch (error) {
    debugLogger.warn('[AIModels] Failed to load cached model status', {
      error,
    });
    statusCache = ensureStatusShape();
  }

  ensureStorageWatch();
  return statusCache;
}

export async function persistStatusMap(map: AiModelStatusMap): Promise<void> {
  const previous = statusCache ? cloneStatusMap(statusCache) : null;
  statusCache = map;
  if (previous) {
    for (const id of AI_MODEL_IDS) {
      const prevState = previous[id].state;
      const nextState = map[id].state;
      if (prevState !== nextState) {
        recordAiModelStatusTransition(id, prevState, nextState);
      }
    }
  }

  try {
    await getStorageAdapter().setItem(STORAGE_KEY, map);
  } catch (error) {
    debugLogger.warn('[AIModels] Failed to persist model status', { error });
  }

  notifyListeners(map);
}

export async function persistStatusForId(status: AiModelStatus): Promise<void> {
  const working = cloneStatusMap(await ensureCacheLoaded());
  working[status.id] = status;
  await persistStatusMap(working);
}

export function notifyListeners(map: AiModelStatusMap): void {
  const snapshot = cloneStatusMap(map);
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      debugLogger.warn('[AIModels] Status listener failed', { error });
    }
  });
}

export async function subscribeStatusUpdates(
  listener: (status: AiModelStatusMap) => void,
): Promise<() => void> {
  listeners.add(listener);
  const snapshot = cloneStatusMap(await ensureCacheLoaded());
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
}

function ensureStorageWatch(): void {
  if (storageUnwatch) return;
  try {
    storageUnwatch = getStorageAdapter().watch<AiModelStatusMap>(
      STORAGE_KEY,
      (next) => {
        statusCache = ensureStatusShape(next ?? undefined);
        notifyListeners(statusCache);
      },
    );
  } catch (error) {
    debugLogger.warn('[AIModels] Failed to watch storage', { error });
  }
}
