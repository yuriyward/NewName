import { recordAiModelProcessingPhaseStart } from '../telemetry';
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
  RefreshAiModelOptions,
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
const DOWNLOAD_STALL_TIMEOUT_MS = 60_000; // 1 minute inactivity watchdog for Chrome model downloads
const DOWNLOAD_OVERALL_TIMEOUT_MS = 10 * 60_000; // 10 minute hard cap for download phase
const PROCESSING_TIMEOUT_MS = 5 * 60_000; // 5 minute timeout for post-download processing phase

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

  await runWithAvailabilityWatchdog(
    'language-model',
    options,
    async (kickWatchdog) => {
      const createOptions: ChromeLanguageModelCreateOptions = {
        signal: options.signal,
        monitor: wrapMonitor(
          'language-model',
          options.onProgress,
          kickWatchdog,
        ),
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
    },
    { languageModel: options.languageModel, summarizer: options.summarizer },
  );
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

  await runWithAvailabilityWatchdog(
    'summarizer',
    options,
    async (kickWatchdog) => {
      const createOptions: ChromeSummarizerOptions = {
        ...options.summarizer,
        type: options.summarizer?.type ?? 'key-points',
        format: options.summarizer?.format ?? 'markdown',
        length: options.summarizer?.length ?? 'short',
        expectedInputLanguages,
        outputLanguage,
        monitor: wrapMonitor('summarizer', options.onProgress, kickWatchdog),
      };

      const summarizer = await ctor.create(createOptions);
      try {
        summarizer.destroy?.();
      } catch (_error) {
        // Ignore cleanup errors.
      }
    },
    { summarizer: options.summarizer },
  );
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

  await runWithAvailabilityWatchdog(
    'language-detector',
    options,
    async (kickWatchdog) => {
      const detector = await ctor.create({
        monitor: wrapMonitor(
          'language-detector',
          options.onProgress,
          kickWatchdog,
        ),
      });
      try {
        detector.destroy?.();
      } catch (_error) {
        // Ignore cleanup errors.
      }
    },
    {},
  );
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

type AvailabilityProbeOptions = Pick<
  RefreshAiModelOptions,
  'languageModel' | 'summarizer'
>;

async function runWithAvailabilityWatchdog(
  id: AiModelId,
  options: EnsureAiModelsOptions,
  action: (kickWatchdog: () => void) => Promise<void>,
  probeOptions: AvailabilityProbeOptions,
): Promise<void> {
  const timeoutMs = options.downloadTimeoutMs ?? DOWNLOAD_STALL_TIMEOUT_MS;
  const overallTimeoutMs =
    options.downloadOverallTimeoutMs ?? DOWNLOAD_OVERALL_TIMEOUT_MS;
  const startTime = Date.now();

  let timer: ReturnType<typeof setTimeout> | null = null;
  const { signal } = options;

  let watchdogResolve: (() => void) | null = null;
  let watchdogReject: ((reason?: unknown) => void) | null = null;
  let downloadCompletedAt: number | null = null; // Track when download phase completes

  const armWatchdog = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const refreshed = await refreshAiModelStatus(id, {
          ...probeOptions,
          force: true,
        });
        if (refreshed.state === 'available') {
          watchdogResolve?.();
          return;
        }

        const elapsed = Date.now() - startTime;

        // Check if Chrome is in post-download processing phase
        // Chrome reports 'processing' or 'after-download' when extracting/loading the model
        const isProcessing =
          refreshed.availability === 'processing' ||
          refreshed.availability === 'after-download';

        // Track when we transition from downloading to processing
        if (isProcessing && !downloadCompletedAt) {
          downloadCompletedAt = Date.now();
          recordAiModelProcessingPhaseStart(id);
        }

        const stillDownloading = refreshed.state === 'downloading';
        const stillPending = stillDownloading || isProcessing;

        // Use different timeouts for download vs processing phase
        const effectiveTimeout = downloadCompletedAt
          ? PROCESSING_TIMEOUT_MS // 5 minutes for processing
          : overallTimeoutMs; // 10 minutes for download

        if (stillPending && elapsed < effectiveTimeout) {
          armWatchdog();
          return;
        }

        // Provide phase-specific error messages
        watchdogReject?.(
          new DOMException(
            downloadCompletedAt
              ? `Model processing for ${id} timed out. Chrome may still be extracting the model. Try refreshing the page or restarting Chrome.`
              : `Download for ${id} stalled. Please click the button again to resume.`,
            'TimeoutError',
          ),
        );
      } catch (error) {
        watchdogReject?.(error);
      }
    }, timeoutMs);
  };

  const abortPromise = new Promise<never>((_, reject) => {
    if (!signal) return;
    if (signal.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      return;
    }
    const abortHandler = (): void => {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', abortHandler, { once: true });
    // Cleanup happens in the finally block below.
  });

  const watchdogPromise = new Promise<void>((resolve, reject) => {
    watchdogResolve = resolve;
    watchdogReject = reject;
  });

  // Start the watchdog immediately so totally-stuck downloads still time out.
  armWatchdog();

  const kickWatchdog = (): void => {
    armWatchdog();
  };

  try {
    await Promise.race([action(kickWatchdog), abortPromise, watchdogPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
