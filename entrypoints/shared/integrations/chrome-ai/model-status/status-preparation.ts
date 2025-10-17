import type {
  ChromeLanguageModelCreateOptions,
  ChromeSummarizerOptions,
} from '../types';
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
  ensureUserActivation,
  isAbortError,
  resolveExpectedInputs,
  resolveExpectedOutputs,
  resolveLanguageDetectorCtor,
  resolveLanguageModelCtor,
  resolveOutputLanguage,
  resolveSummarizerCtor,
  resolveSummarizerInputLanguages,
  safeEmit,
  serializeIoDescriptor,
  throwIfAborted,
  wrapMonitor,
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

async function ensureLanguageModelReady(
  options: EnsureAiModelsOptions,
): Promise<void> {
  const ctor = resolveLanguageModelCtor();
  if (!ctor?.create) {
    throw new Error('LanguageModel API unavailable');
  }

  throwIfAborted(options.signal);
  ensureUserActivation('language-model');

  const outputLanguage = resolveOutputLanguage(options.languageModel);

  const expectedInputs = resolveExpectedInputs(
    options.languageModel?.expectedInputs,
    outputLanguage,
  );
  const expectedOutputs = resolveExpectedOutputs(
    options.languageModel?.expectedOutputs,
    outputLanguage,
  );

  const createOptions: ChromeLanguageModelCreateOptions = {
    signal: options.signal,
    monitor: wrapMonitor('language-model', options.onProgress),
    systemPrompt: options.languageModel?.systemPrompt,
    initialPrompts: options.languageModel?.initialPrompts,
    expectedInputs,
    expectedOutputs,
    outputLanguage,
  };

  const session = await ctor.create(createOptions);
  try {
    session.destroy?.();
  } catch (_error) {
    // Best effort cleanup; ignore errors.
  }
}

async function ensureSummarizerReady(
  options: EnsureAiModelsOptions,
): Promise<void> {
  const ctor = resolveSummarizerCtor();
  if (!ctor?.create) {
    throw new Error('Summarizer API unavailable');
  }

  throwIfAborted(options.signal);
  ensureUserActivation('summarizer');

  const outputLanguage =
    options.summarizer?.outputLanguage ??
    options.languageModel?.outputLanguage ??
    'en';
  const expectedInputLanguages = resolveSummarizerInputLanguages(
    options.summarizer?.expectedInputLanguages,
    outputLanguage,
  );

  const createOptions: ChromeSummarizerOptions = {
    type: options.summarizer?.type ?? 'key-points',
    format: options.summarizer?.format ?? 'markdown',
    length: options.summarizer?.length ?? 'short',
    expectedInputLanguages,
    outputLanguage,
    monitor: wrapMonitor('summarizer', options.onProgress),
  };

  const summarizer = await ctor.create(createOptions);
  try {
    summarizer.destroy?.();
  } catch (_error) {
    // Ignore cleanup errors.
  }
}

async function ensureLanguageDetectorReady(
  options: EnsureAiModelsOptions,
): Promise<void> {
  const ctor = resolveLanguageDetectorCtor();
  if (!ctor?.create) {
    throw new Error('LanguageDetector API unavailable');
  }

  throwIfAborted(options.signal);
  ensureUserActivation('language-detector');

  const detector = await ctor.create({
    monitor: wrapMonitor('language-detector', options.onProgress),
  });
  try {
    detector.destroy?.();
  } catch (_error) {
    // Ignore cleanup errors.
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
