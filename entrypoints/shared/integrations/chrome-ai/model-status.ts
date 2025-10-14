/**
 * Shared helpers for checking and preparing Chrome built-in AI models.
 * Centralises availability checks, download orchestration, and status caching.
 */
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type {
  ChromeAIMonitor,
  ChromeLanguageDetectorConstructor,
  ChromeLanguageModelConstructor,
  ChromeLanguageModelCreateOptions,
  ChromeLanguageModelIODescriptor,
  ChromeSummarizerConstructor,
  ChromeSummarizerOptions,
} from '@/entrypoints/shared/integrations/chrome-ai/types';
import {
  getStorageAdapter,
  registerResetHook,
} from '@/entrypoints/shared/settings/storage-state';
import {
  recordAiModelDownloadComplete,
  recordAiModelDownloadStart,
  recordAiModelError,
  recordAiModelStatusTransition,
} from './telemetry';

const STORAGE_KEY = 'session:ai.models.status';

export const AI_MODEL_IDS = [
  'language-model',
  'summarizer',
  'language-detector',
] as const;

export type AiModelId = (typeof AI_MODEL_IDS)[number];

export type AiModelState =
  | 'unknown'
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'unavailable'
  | 'unsupported'
  | 'error';

export interface AiModelStatus {
  id: AiModelId;
  state: AiModelState;
  lastUpdated: number;
  availability?: string;
  detail?: string;
  errorCode?: string;
  requiresUserActivation: boolean;
}

export type AiModelStatusMap = Record<AiModelId, AiModelStatus>;

export type AiModelProgressEvent =
  | {
      id: AiModelId;
      type: 'status';
      status: AiModelState;
      availability?: string;
    }
  | {
      id: AiModelId;
      type: 'download-start';
    }
  | {
      id: AiModelId;
      type: 'download-progress';
      loaded?: number;
      total?: number;
    }
  | {
      id: AiModelId;
      type: 'complete';
    }
  | {
      id: AiModelId;
      type: 'error';
      error: string;
      errorCode?: string;
    };

export interface RefreshAiModelOptions {
  summarizer?: Partial<
    Pick<
      ChromeSummarizerOptions,
      'type' | 'format' | 'length' | 'expectedInputLanguages' | 'outputLanguage'
    >
  >;
  languageModel?: Partial<
    Pick<
      ChromeLanguageModelCreateOptions,
      | 'systemPrompt'
      | 'initialPrompts'
      | 'expectedInputs'
      | 'expectedOutputs'
      | 'outputLanguage'
    >
  >;
}

export interface EnsureAiModelsOptions extends RefreshAiModelOptions {
  ids?: readonly AiModelId[];
  signal?: AbortSignal;
  onProgress?: (event: AiModelProgressEvent) => void;
}

let statusCache: AiModelStatusMap | null = null;
let storageUnwatch: (() => void) | null = null;
const listeners = new Set<(status: AiModelStatusMap) => void>();
const pendingProbes = new Map<AiModelId, Promise<AiModelStatus>>();
const inFlightPreparations = new Map<string, Promise<AiModelStatusMap>>();

/**
 * Returns the last known status for all AI models (without forcing a refresh).
 */
export async function getCachedAiModelStatuses(): Promise<AiModelStatusMap> {
  const current = await ensureCacheLoaded();
  return cloneStatusMap(current);
}

/**
 * Refreshes availability information for the provided models and persists it.
 */
export async function refreshAiModelStatuses(
  ids: readonly AiModelId[] = AI_MODEL_IDS,
  options?: RefreshAiModelOptions,
): Promise<AiModelStatusMap> {
  const working = cloneStatusMap(await ensureCacheLoaded());
  let changed = false;

  for (const id of ids) {
    const status = await probeModel(id, options);
    working[id] = status;
    changed = true;
  }

  if (changed) {
    await persistStatusMap(working);
  }
  return cloneStatusMap(working);
}

/**
 * Ensures that the given models are downloaded and ready to use.
 * Calls create/destroy on the relevant APIs to trigger downloads when required.
 */
export async function ensureAiModelsReady(
  options: EnsureAiModelsOptions = {},
): Promise<AiModelStatusMap> {
  const ids = (options.ids ?? AI_MODEL_IDS) as readonly AiModelId[];
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

/**
 * Subscribe to status updates. Listener is invoked immediately with current snapshot.
 */
export async function subscribeAiModelStatuses(
  listener: (status: AiModelStatusMap) => void,
): Promise<() => void> {
  listeners.add(listener);
  const snapshot = cloneStatusMap(await ensureCacheLoaded());
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
}

registerResetHook(() => {
  statusCache = null;
  pendingProbes.clear();
  listeners.clear();
  storageUnwatch?.();
  storageUnwatch = null;
});

async function refreshAiModelStatus(
  id: AiModelId,
  options: RefreshAiModelOptions & { force?: boolean } = {},
): Promise<AiModelStatus> {
  const current = await ensureCacheLoaded();
  if (!options.force && current[id].state !== 'unknown') {
    return current[id];
  }

  let probePromise = pendingProbes.get(id);
  if (!probePromise) {
    probePromise = probeModel(id, options);
    pendingProbes.set(id, probePromise);
    probePromise.finally(() => {
      pendingProbes.delete(id);
    });
  }

  const probed = await probePromise;
  await persistStatusForId(probed);
  return probed;
}

async function prepareModels(
  ids: readonly AiModelId[],
  options: EnsureAiModelsOptions,
): Promise<AiModelStatusMap> {
  const working = cloneStatusMap(await ensureCacheLoaded());

  // Phase 1: Check availability for all models first
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

  // Filter models that need downloading
  const modelsToDownload = availabilityResults.filter(
    ({ status }) =>
      status.state !== 'available' && status.state !== 'unsupported',
  );

  if (modelsToDownload.length === 0) {
    return cloneStatusMap(working);
  }

  // Phase 2a: Download Language Detector FIRST if needed
  // Chrome's LanguageModel API requires Language Detector to be available when using language options
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

  // Phase 2b: Trigger remaining downloads in parallel to preserve user activation
  // User activation is transient and shared across all create() calls made in the same task
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

  // Check if any non-abort errors occurred
  const criticalErrors = downloadResults.filter(
    (result) => !result.success && result.error && !isAbortError(result.error),
  );

  if (criticalErrors.length > 0) {
    throw criticalErrors[0].error;
  }

  return cloneStatusMap(working);
}

async function probeModel(
  id: AiModelId,
  options: RefreshAiModelOptions = {},
): Promise<AiModelStatus> {
  switch (id) {
    case 'language-model':
      return probeLanguageModel(options.languageModel);
    case 'summarizer':
      return probeSummarizer(options.summarizer);
    case 'language-detector':
      return probeLanguageDetector();
    default:
      return buildStatus(id, 'unsupported', {
        detail: 'Unknown model id',
      });
  }
}

async function probeLanguageModel(
  options: RefreshAiModelOptions['languageModel'],
): Promise<AiModelStatus> {
  const ctor = resolveLanguageModelCtor();
  if (!ctor?.create) {
    return buildStatus('language-model', 'unsupported', {
      detail: 'LanguageModel API unavailable',
    });
  }

  try {
    let availability: string | undefined;
    let reason: string | undefined;

    // Extract outputLanguage from options with 'en' fallback
    const outputLanguage =
      options?.outputLanguage ||
      options?.expectedOutputs?.[0]?.language ||
      options?.expectedOutputs?.[0]?.languages?.[0] ||
      'en';

    console.log(
      '[probeLanguageModel] Checking availability with outputLanguage:',
      outputLanguage,
    );

    const expectedInputs = resolveExpectedInputs(
      options?.expectedInputs,
      outputLanguage,
    );
    const expectedOutputs = resolveExpectedOutputs(
      options?.expectedOutputs,
      outputLanguage,
    );

    const availabilityOptions = {
      outputLanguage,
      expectedInputs,
      expectedOutputs,
    } as const;

    if (typeof ctor.availability === 'function') {
      console.log(
        '[probeLanguageModel] availability options:',
        availabilityOptions,
      );
      availability = await ctor.availability(availabilityOptions);
    } else if (typeof ctor.capabilities === 'function') {
      console.log(
        '[probeLanguageModel] capabilities options:',
        availabilityOptions,
      );
      const capabilities = await ctor.capabilities(availabilityOptions);
      availability = capabilities?.available;
      reason = capabilities?.reason;
    }

    const normalised = normaliseAvailability(availability);
    const status =
      normalised.state === 'unknown'
        ? buildStatus('language-model', 'available', {
            availability,
            detail: reason,
            requiresUserActivation: false,
          })
        : buildStatus('language-model', normalised.state, {
            availability,
            detail: reason,
            requiresUserActivation: normalised.requiresUserActivation ?? false,
          });

    return status;
  } catch (error) {
    debugLogger.warn('[AIModels] Language model availability failed', {
      error,
    });
    return buildStatus('language-model', 'error', {
      detail: deriveErrorMessage(error),
      errorCode: deriveErrorCode(error),
    });
  }
}

async function probeSummarizer(
  options: RefreshAiModelOptions['summarizer'],
): Promise<AiModelStatus> {
  const ctor = resolveSummarizerCtor();
  if (!ctor?.create) {
    return buildStatus('summarizer', 'unsupported', {
      detail: 'Summarizer API unavailable',
    });
  }

  try {
    // Extract outputLanguage from options with 'en' fallback
    const outputLanguage = options?.outputLanguage || 'en';

    console.log(
      '[probeSummarizer] Checking availability with outputLanguage:',
      outputLanguage,
    );

    const expectedInputLanguages = resolveSummarizerInputLanguages(
      options?.expectedInputLanguages,
      outputLanguage,
    );

    console.log('[probeSummarizer] availability options:', {
      outputLanguage,
      expectedInputLanguages,
    });
    const availability = await ctor.availability?.({
      outputLanguage,
      expectedInputLanguages,
    });
    const normalised = normaliseAvailability(availability);
    return normalised.state === 'unknown'
      ? buildStatus('summarizer', 'available', {
          availability,
          requiresUserActivation: false,
        })
      : buildStatus('summarizer', normalised.state, {
          availability,
          requiresUserActivation: normalised.requiresUserActivation ?? false,
        });
  } catch (error) {
    debugLogger.warn('[AIModels] Summarizer availability failed', { error });
    return buildStatus('summarizer', 'error', {
      detail: deriveErrorMessage(error),
      errorCode: deriveErrorCode(error),
    });
  }
}

async function probeLanguageDetector(): Promise<AiModelStatus> {
  const ctor = resolveLanguageDetectorCtor();
  if (!ctor?.create) {
    return buildStatus('language-detector', 'unsupported', {
      detail: 'LanguageDetector API unavailable',
    });
  }

  try {
    const availability = await ctor.availability?.();
    const normalised = normaliseAvailability(availability);
    return normalised.state === 'unknown'
      ? buildStatus('language-detector', 'available', {
          availability,
          requiresUserActivation: false,
        })
      : buildStatus('language-detector', normalised.state, {
          availability,
          requiresUserActivation: normalised.requiresUserActivation ?? false,
        });
  } catch (error) {
    debugLogger.warn('[AIModels] Language detector availability failed', {
      error,
    });
    return buildStatus('language-detector', 'error', {
      detail: deriveErrorMessage(error),
      errorCode: deriveErrorCode(error),
    });
  }
}

function resolveExpectedInputs(
  descriptors: ChromeLanguageModelIODescriptor[] | undefined,
  language: string,
): ChromeLanguageModelIODescriptor[] {
  if (descriptors && descriptors.length > 0) {
    return descriptors;
  }
  return [createTextDescriptor(language)];
}

function resolveExpectedOutputs(
  descriptors: ChromeLanguageModelIODescriptor[] | undefined,
  language: string,
): ChromeLanguageModelIODescriptor[] {
  if (descriptors && descriptors.length > 0) {
    return descriptors;
  }
  return [createTextDescriptor(language)];
}

function createTextDescriptor(
  language: string,
): ChromeLanguageModelIODescriptor {
  const normalised = language?.toLowerCase?.() ?? 'en';
  return {
    type: 'text',
    language: normalised,
    languages: [normalised],
  };
}

function resolveSummarizerInputLanguages(
  languages: string[] | undefined,
  fallback: string,
): string[] {
  if (languages && languages.length > 0) {
    return languages;
  }
  const normalised = fallback?.toLowerCase?.() ?? 'en';
  return [normalised];
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

  // Extract output language from expectedOutputs if available, default to 'en'
  // Chrome requires an explicit outputLanguage parameter to avoid warnings
  const outputLanguage =
    options.languageModel?.outputLanguage ||
    options.languageModel?.expectedOutputs?.[0]?.language ||
    options.languageModel?.expectedOutputs?.[0]?.languages?.[0] ||
    'en';

  const expectedInputs = resolveExpectedInputs(
    options.languageModel?.expectedInputs,
    outputLanguage,
  );
  const expectedOutputs = resolveExpectedOutputs(
    options.languageModel?.expectedOutputs,
    outputLanguage,
  );

  console.log('[LanguageModel] Resolved outputLanguage:', {
    fromOptions: options.languageModel?.outputLanguage,
    fromExpectedOutputs: options.languageModel?.expectedOutputs?.[0]?.language,
    fromExpectedOutputsLanguages:
      options.languageModel?.expectedOutputs?.[0]?.languages?.[0],
    finalValue: outputLanguage,
    expectedInputs,
    expectedOutputs,
  });

  const createOptions: ChromeLanguageModelCreateOptions = {
    signal: options.signal,
    monitor: wrapMonitor('language-model', options.onProgress),
    systemPrompt: options.languageModel?.systemPrompt,
    initialPrompts: options.languageModel?.initialPrompts,
    expectedInputs,
    expectedOutputs,
    outputLanguage,
  };

  console.log('[LanguageModel] Calling create() with options:', createOptions);

  const session = await ctor.create(createOptions);

  console.log('[LanguageModel] Session created successfully');
  try {
    session.destroy?.();
  } catch (error) {
    debugLogger.warn('[AIModels] Language model destroy failed', { error });
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
  } catch (error) {
    debugLogger.warn('[AIModels] Summarizer destroy failed', { error });
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
  } catch (error) {
    debugLogger.warn('[AIModels] Language detector destroy failed', { error });
  }
}

function resolveLanguageModelCtor(): ChromeLanguageModelConstructor | null {
  const globalScope = globalThis as typeof globalThis & {
    LanguageModel?: ChromeLanguageModelConstructor;
    ai?: { languageModel?: ChromeLanguageModelConstructor };
  };

  if (globalScope.LanguageModel?.create) {
    return globalScope.LanguageModel;
  }
  if (globalScope.ai?.languageModel?.create) {
    return globalScope.ai.languageModel;
  }
  return null;
}

function resolveSummarizerCtor(): ChromeSummarizerConstructor | null {
  const globalScope = globalThis as typeof globalThis & {
    Summarizer?: ChromeSummarizerConstructor;
  };
  return globalScope.Summarizer?.create ? globalScope.Summarizer : null;
}

function resolveLanguageDetectorCtor(): ChromeLanguageDetectorConstructor | null {
  const globalScope = globalThis as typeof globalThis & {
    LanguageDetector?: ChromeLanguageDetectorConstructor;
    ai?: { languageDetector?: ChromeLanguageDetectorConstructor };
  };

  if (globalScope.LanguageDetector?.create) {
    return globalScope.LanguageDetector;
  }
  if (globalScope.ai?.languageDetector?.create) {
    return globalScope.ai.languageDetector;
  }
  return null;
}

function wrapMonitor(
  id: AiModelId,
  listener?: (event: AiModelProgressEvent) => void,
): ((monitor: ChromeAIMonitor) => void) | undefined {
  if (!listener) return undefined;

  return (monitor) => {
    try {
      monitor.addEventListener?.('downloadprogress', (event) => {
        safeEmit(listener, {
          id,
          type: 'download-progress',
          loaded: event.loaded,
          total: event.total,
        });
      });
    } catch (error) {
      debugLogger.warn('[AIModels] Failed to attach monitor listener', {
        id,
        error,
      });
    }
  };
}

async function ensureCacheLoaded(): Promise<AiModelStatusMap> {
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

async function persistStatusMap(map: AiModelStatusMap): Promise<void> {
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

async function persistStatusForId(status: AiModelStatus): Promise<void> {
  const working = cloneStatusMap(await ensureCacheLoaded());
  working[status.id] = status;
  await persistStatusMap(working);
}

function ensureStatusShape(
  stored?: Partial<AiModelStatusMap>,
): AiModelStatusMap {
  return AI_MODEL_IDS.reduce((acc, id) => {
    const base = createDefaultStatus(id);
    const existing = stored?.[id];
    acc[id] = existing
      ? {
          ...base,
          ...existing,
          id,
          requiresUserActivation: existing.requiresUserActivation ?? false,
        }
      : base;
    return acc;
  }, {} as AiModelStatusMap);
}

function createDefaultStatus(id: AiModelId): AiModelStatus {
  return {
    id,
    state: 'unknown',
    lastUpdated: 0,
    requiresUserActivation: false,
  };
}

function cloneStatusMap(map: AiModelStatusMap): AiModelStatusMap {
  return AI_MODEL_IDS.reduce((acc, id) => {
    acc[id] = { ...map[id] };
    return acc;
  }, {} as AiModelStatusMap);
}

function notifyListeners(map: AiModelStatusMap): void {
  const snapshot = cloneStatusMap(map);
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      debugLogger.warn('[AIModels] Status listener failed', { error });
    }
  });
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

function buildStatus(
  id: AiModelId,
  state: AiModelState,
  extras: Partial<Omit<AiModelStatus, 'id' | 'state' | 'lastUpdated'>> = {},
): AiModelStatus {
  return {
    id,
    state,
    lastUpdated: Date.now(),
    availability: extras.availability,
    detail: extras.detail,
    errorCode: extras.errorCode,
    requiresUserActivation: extras.requiresUserActivation ?? false,
  };
}

function normaliseAvailability(availability?: string | null): {
  state: AiModelState;
  requiresUserActivation?: boolean;
} {
  switch (availability) {
    case undefined:
    case null:
      return { state: 'unknown' };
    case 'available':
    case 'readily':
      return { state: 'available' };
    case 'processing':
    case 'downloading':
      return { state: 'downloading' };
    case 'downloadable':
    case 'after-download':
      return { state: 'downloadable', requiresUserActivation: true };
    case 'unavailable':
    case 'no':
      return { state: 'unavailable' };
    default:
      return { state: 'unknown' };
  }
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) return;
  const reason = signal.reason;
  if (reason instanceof Error) {
    throw reason;
  }
  throw new DOMException('Aborted', 'AbortError');
}

function ensureUserActivation(modelId: AiModelId): void {
  const globalScope = globalThis as typeof globalThis & {
    navigator?: {
      userActivation?: {
        isActive?: boolean;
      };
    };
  };

  if (
    globalScope.navigator?.userActivation &&
    !globalScope.navigator.userActivation.isActive
  ) {
    throw new DOMException(
      `User activation expired before downloading ${modelId}. Please click the button again and keep the page focused.`,
      'NotAllowedError',
    );
  }
}

function safeEmit(
  listener: ((event: AiModelProgressEvent) => void) | undefined,
  event: AiModelProgressEvent,
): void {
  if (listener) {
    try {
      listener(event);
    } catch (error) {
      debugLogger.warn('[AIModels] Progress listener failed', {
        event,
        error,
      });
    }
  }

  switch (event.type) {
    case 'download-start':
      recordAiModelDownloadStart(event.id);
      break;
    case 'complete':
      recordAiModelDownloadComplete(event.id);
      break;
    case 'error':
      recordAiModelError(event.id, event.errorCode ?? event.error);
      break;
    default:
      break;
  }
}

function deriveErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    let message = error.message;

    // Add specific guidance for common error scenarios
    if (message.includes('service is not running')) {
      message +=
        ' Check chrome://on-device-internals to verify Gemini Nano status.';
    } else if (message.includes('language detection model')) {
      message +=
        ' The Language Detector must be downloaded first before other models can use language features.';
    } else if (message.includes('NotAllowedError')) {
      message +=
        ' This usually means user activation expired. Please click the button again.';
    } else if (message.includes('storage') || message.includes('disk')) {
      message +=
        ' Ensure you have at least 10 GB free space. Models are auto-deleted if space drops below 10 GB.';
    }

    return message;
  }
  return String(error);
}

function deriveErrorCode(error: unknown): string | undefined {
  if (error instanceof DOMException) {
    return error.name;
  }
  if (error instanceof Error && error.name) {
    return error.name;
  }
  return undefined;
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }
  return false;
}

function createPreparationKey(
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
      initialPrompts: languageModel.initialPrompts?.length ?? 0,
      expectedInputs: languageModel.expectedInputs?.map(serializeIoDescriptor),
      expectedOutputs: languageModel.expectedOutputs?.map(
        serializeIoDescriptor,
      ),
    },
  });
}

function serializeIoDescriptor(
  descriptor: ChromeLanguageModelIODescriptor,
): string {
  return JSON.stringify({
    type: descriptor.type,
    language: descriptor.language,
    languages: descriptor.languages,
  });
}
