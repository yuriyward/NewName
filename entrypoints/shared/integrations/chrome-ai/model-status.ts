import {
  ensureCacheLoaded,
  persistStatusMap,
  subscribeStatusUpdates,
} from './model-status/status-cache';
import { ensureModelsReady } from './model-status/status-preparation';
import { probeModel } from './model-status/status-probe';
import {
  AI_MODEL_IDS as BASE_AI_MODEL_IDS,
  type AiModelId as InternalAiModelId,
  type AiModelProgressEvent as InternalAiModelProgressEvent,
  type AiModelState as InternalAiModelState,
  type AiModelStatus as InternalAiModelStatus,
  type AiModelStatusMap as InternalAiModelStatusMap,
  type EnsureAiModelsOptions as InternalEnsureAiModelsOptions,
  type RefreshAiModelOptions as InternalRefreshAiModelOptions,
} from './model-status/status-types';
import { cloneStatusMap } from './model-status/status-utils';

const MODEL_IDS = BASE_AI_MODEL_IDS;

export const AI_MODEL_IDS = MODEL_IDS;

type AiModelId = InternalAiModelId;
type AiModelState = InternalAiModelState;
type AiModelStatus = InternalAiModelStatus;
type AiModelStatusMap = InternalAiModelStatusMap;
type AiModelProgressEvent = InternalAiModelProgressEvent;
type RefreshAiModelOptions = InternalRefreshAiModelOptions;
type EnsureAiModelsOptions = InternalEnsureAiModelsOptions;

export type {
  AiModelId,
  AiModelState,
  AiModelStatus,
  AiModelStatusMap,
  AiModelProgressEvent,
  RefreshAiModelOptions,
  EnsureAiModelsOptions,
};

export async function getCachedAiModelStatuses(): Promise<AiModelStatusMap> {
  const current = await ensureCacheLoaded();
  return cloneStatusMap(current);
}

export async function refreshAiModelStatuses(
  ids: readonly AiModelId[] = MODEL_IDS,
  options?: RefreshAiModelOptions,
): Promise<AiModelStatusMap> {
  const working = cloneStatusMap(await ensureCacheLoaded());
  let changed = false;

  for (const id of ids) {
    const status = await probeModel(id, options ?? {});
    working[id] = status;
    changed = true;
  }

  if (changed) {
    await persistStatusMap(working);
  }

  return cloneStatusMap(working);
}

export async function ensureAiModelsReady(
  options: EnsureAiModelsOptions = {},
): Promise<AiModelStatusMap> {
  const ids = (options.ids ?? MODEL_IDS) as readonly AiModelId[];
  return ensureModelsReady(ids, options);
}

export async function subscribeAiModelStatuses(
  listener: (status: AiModelStatusMap) => void,
): Promise<() => void> {
  return subscribeStatusUpdates(listener);
}
