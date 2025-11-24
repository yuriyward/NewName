import { ensureLanguageDetectorReady } from './download-handlers/language-detector';
import { ensureLanguageModelReady } from './download-handlers/language-model';
import { ensureSummarizerReady } from './download-handlers/summarizer';
import {
  ensureCacheLoaded,
  persistStatusForId,
  persistStatusMap,
} from './status-cache';
import { refreshAiModelStatus } from './status-probe';
import type {
  AiModelId,
  AiModelStatusMap,
  EnsureAiModelsOptions,
} from './status-types';
import {
  buildStatus,
  cloneStatusMap,
  deriveErrorCode,
  deriveErrorMessage,
  isAbortError,
  safeEmit,
  serializeIoDescriptor,
  throwIfAborted,
} from './status-utils';

const inFlightPreparations = new Map<string, Promise<AiModelStatusMap>>();

export async function ensureModelsReady(
  ids: readonly AiModelId[],
  options: EnsureAiModelsOptions,
): Promise<AiModelStatusMap> {
  const key = createPreparationKey(ids, options);
  const existing = inFlightPreparations.get(key);
  if (existing) {
    return existing;
  }

  const preparation = prepareModels(ids, options);
  inFlightPreparations.set(key, preparation);
  try {
    return await preparation;
  } finally {
    inFlightPreparations.delete(key);
  }
}

async function prepareModels(
  ids: readonly AiModelId[],
  options: EnsureAiModelsOptions,
): Promise<AiModelStatusMap> {
  const working = cloneStatusMap(await ensureCacheLoaded());

  const availabilityChecks = ids.map(async (id) => {
    throwIfAborted(options.signal);
    safeEmit(options.onProgress, {
      id,
      type: 'status',
      status: working[id].state,
      availability: working[id].availability,
    });
    const refreshed = await refreshAiModelStatus(id, {
      summarizer: options.summarizer,
      languageModel: options.languageModel,
      force: true,
    });
    working[id] = refreshed;
    return { id, status: refreshed };
  });

  const availabilityResults = await Promise.all(availabilityChecks);

  const modelsToDownload = availabilityResults.filter(
    ({ status }) =>
      status.state !== 'available' && status.state !== 'unsupported',
  );

  if (modelsToDownload.length === 0) {
    return cloneStatusMap(working);
  }

  const languageDetectorToDownload = modelsToDownload.find(
    ({ id }) => id === 'language-detector',
  );

  if (languageDetectorToDownload) {
    try {
      throwIfAborted(options.signal);
      const starting = buildStatus('language-detector', 'downloading', {
        availability: 'downloading',
        requiresUserActivation: false,
      });
      working['language-detector'] = starting;
      await persistStatusForId(starting);
      safeEmit(options.onProgress, {
        id: 'language-detector',
        type: 'download-start',
      });
      await triggerModelDownload('language-detector', options);

      const finalStatus = await refreshAiModelStatus('language-detector', {
        force: true,
      });
      working['language-detector'] = finalStatus;
      safeEmit(options.onProgress, {
        id: 'language-detector',
        type: 'complete',
      });
    } catch (error) {
      const errorMessage = deriveErrorMessage(error);
      const errorCode = deriveErrorCode(error);

      const isTransient =
        error == null ||
        errorCode === 'UnknownError' ||
        (error instanceof DOMException &&
          (error.name === 'InvalidStateError' ||
            error.name === 'NotFoundError'));

      if (isTransient) {
        // Treat empty / transient failures as "not ready yet" instead of hard error.
        const pending = buildStatus('language-detector', 'unknown', {
          detail:
            'Chrome is still starting the Language Detector. Try again in a few seconds with this tab focused.',
          errorCode: 'InitializationPending',
        });
        working['language-detector'] = pending;
        await persistStatusForId(pending);
        safeEmit(options.onProgress, {
          id: 'language-detector',
          type: 'status',
          status: pending.state,
          availability: pending.availability,
        });
        return cloneStatusMap(working);
      }

      safeEmit(options.onProgress, {
        id: 'language-detector',
        type: 'error',
        error: errorMessage,
        errorCode,
      });
      const errored = buildStatus('language-detector', 'error', {
        detail: errorMessage,
        errorCode,
      });
      working['language-detector'] = errored;
      await persistStatusForId(errored);
      if (!isAbortError(error)) {
        throw new Error(
          `Language Detector is required but failed to download: ${errorMessage}`,
        );
      }
      return cloneStatusMap(working);
    }
  }

  const remainingModels = modelsToDownload.filter(
    ({ id }) => id !== 'language-detector',
  );

  const downloadPromises = remainingModels.map(async ({ id }) => {
    try {
      throwIfAborted(options.signal);
      const starting = buildStatus(id, 'downloading', {
        availability: 'downloading',
        requiresUserActivation: false,
      });
      working[id] = starting;
      await persistStatusForId(starting);
      safeEmit(options.onProgress, { id, type: 'download-start' });
      await triggerModelDownload(id, options);

      const finalStatus = await refreshAiModelStatus(id, {
        summarizer: options.summarizer,
        languageModel: options.languageModel,
        force: true,
      });
      working[id] = finalStatus;
      safeEmit(options.onProgress, { id, type: 'complete' });
      return { id, success: true, status: finalStatus };
    } catch (error) {
      const errorMessage = deriveErrorMessage(error);
      const errorCode = deriveErrorCode(error);
      safeEmit(options.onProgress, {
        id,
        type: 'error',
        error: errorMessage,
        errorCode,
      });
      const errored = buildStatus(id, 'error', {
        detail: errorMessage,
        errorCode,
      });
      working[id] = errored;
      await persistStatusForId(errored);
      return { id, success: false, error, status: errored };
    }
  });

  const downloadResults = await Promise.all(downloadPromises);

  const criticalErrors = downloadResults.filter(
    (result) => !result.success && result.error && !isAbortError(result.error),
  );

  if (criticalErrors.length > 0) {
    throw criticalErrors[0].error;
  }

  await persistStatusMap(working);
  return cloneStatusMap(working);
}

async function triggerModelDownload(
  id: AiModelId,
  options: EnsureAiModelsOptions,
): Promise<void> {
  switch (id) {
    case 'language-model':
      await ensureLanguageModelReady(options);
      break;
    case 'summarizer':
      await ensureSummarizerReady(options);
      break;
    case 'language-detector':
      await ensureLanguageDetectorReady(options);
      break;
    default:
      break;
  }
}

export function createPreparationKey(
  ids: readonly AiModelId[],
  options: EnsureAiModelsOptions,
): string {
  const sortedIds = [...ids].sort();
  const summarizer = options.summarizer ?? {};
  const languageModel = options.languageModel ?? {};
  return JSON.stringify({
    ids: sortedIds,
    summarizer: {
      type: summarizer.type,
      format: summarizer.format,
      length: summarizer.length,
      outputLanguage: summarizer.outputLanguage,
      expectedInputLanguages: summarizer.expectedInputLanguages,
    },
    languageModel: {
      systemPrompt: languageModel.systemPrompt,
      initialPromptsCount: languageModel.initialPrompts?.length ?? 0,
      expectedInputs: languageModel.expectedInputs?.map(serializeIoDescriptor),
      expectedOutputs: languageModel.expectedOutputs?.map(
        serializeIoDescriptor,
      ),
    },
  });
}

/**
 * Clears all in-flight preparation cache entries for the specified models.
 * This forces a fresh download attempt with new progress monitoring,
 * useful when retrying after a failed or stalled download.
 *
 * Unlike the previous implementation, this clears ALL cache entries that include
 * the specified model IDs, regardless of the options configuration. This is necessary
 * because cache keys include complex options (summarizer, languageModel config) that
 * vary between calls, and we need to ensure the cache is fully cleared for retry.
 *
 * @param ids - Model IDs to clear from cache
 */
export function clearInFlightPreparation(ids: readonly AiModelId[]): void {
  // Collect all keys that include any of the specified model IDs
  const keysToDelete: string[] = [];

  for (const [key] of inFlightPreparations) {
    try {
      const keyData = JSON.parse(key);
      // Check if any of the target IDs are in this cache entry's ID list
      if (ids.some((id) => keyData.ids?.includes(id))) {
        keysToDelete.push(key);
      }
    } catch {}
  }

  // Delete all matching entries
  for (const key of keysToDelete) {
    inFlightPreparations.delete(key);
  }
}
