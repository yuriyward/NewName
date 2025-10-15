import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { normalizeLanguageCode } from '@/entrypoints/shared/integrations/chrome-ai/language-helpers';
import {
  recordAiModelDownloadComplete,
  recordAiModelDownloadStart,
  recordAiModelError,
} from '../telemetry';
import type {
  ChromeAIMonitor,
  ChromeLanguageDetectorConstructor,
  ChromeLanguageModelConstructor,
  ChromeLanguageModelIODescriptor,
  ChromeSummarizerConstructor,
} from '../types';

import {
  AI_MODEL_IDS,
  type AiModelId,
  type AiModelProgressEvent,
  type AiModelState,
  type AiModelStatus,
  type AiModelStatusMap,
  type RefreshAiModelOptions,
} from './status-types';

export function createDefaultStatus(id: AiModelId): AiModelStatus {
  return {
    id,
    state: 'unknown',
    lastUpdated: 0,
    requiresUserActivation: false,
  };
}

export function ensureStatusShape(
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

export function cloneStatusMap(map: AiModelStatusMap): AiModelStatusMap {
  return AI_MODEL_IDS.reduce((acc, id) => {
    acc[id] = { ...map[id] };
    return acc;
  }, {} as AiModelStatusMap);
}

export function buildStatus(
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

export function normaliseAvailability(availability?: string | null): {
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

export function resolveExpectedInputs(
  descriptors: ChromeLanguageModelIODescriptor[] | undefined,
  language: string,
): ChromeLanguageModelIODescriptor[] {
  if (descriptors && descriptors.length > 0) {
    return descriptors;
  }
  return [createTextDescriptor(language)];
}

export function resolveExpectedOutputs(
  descriptors: ChromeLanguageModelIODescriptor[] | undefined,
  language: string,
): ChromeLanguageModelIODescriptor[] {
  if (descriptors && descriptors.length > 0) {
    return descriptors;
  }
  return [createTextDescriptor(language)];
}

export function createTextDescriptor(
  language: string,
): ChromeLanguageModelIODescriptor {
  const normalised = language?.toLowerCase?.() ?? 'en';
  return {
    type: 'text',
    language: normalised,
    languages: [normalised],
  };
}

export function resolveSummarizerInputLanguages(
  languages: string[] | undefined,
  fallback: string,
): string[] {
  if (languages && languages.length > 0) {
    return languages.map((language) => normalizeLanguageCode(language));
  }
  return [normalizeLanguageCode(fallback)];
}

export function deriveErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    let message = error.message;

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

export function deriveErrorCode(error: unknown): string | undefined {
  if (error instanceof DOMException) {
    return error.name;
  }
  if (error instanceof Error && error.name) {
    return error.name;
  }
  return undefined;
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }
  return false;
}

export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) return;
  const { reason } = signal;
  if (reason instanceof Error) {
    throw reason;
  }
  throw new DOMException('Aborted', 'AbortError');
}

export function ensureUserActivation(modelId: AiModelId): void {
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

export function safeEmit(
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

export function wrapMonitor(
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

export function resolveLanguageModelCtor(): ChromeLanguageModelConstructor | null {
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

export function resolveSummarizerCtor(): ChromeSummarizerConstructor | null {
  const globalScope = globalThis as typeof globalThis & {
    Summarizer?: ChromeSummarizerConstructor;
  };
  return globalScope.Summarizer?.create ? globalScope.Summarizer : null;
}

export function resolveLanguageDetectorCtor(): ChromeLanguageDetectorConstructor | null {
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

export function serializeIoDescriptor(
  descriptor: ChromeLanguageModelIODescriptor,
): string {
  return JSON.stringify({
    type: descriptor.type,
    language: descriptor.language,
    languages: descriptor.languages,
  });
}

export function resolveOutputLanguage(
  options: RefreshAiModelOptions['languageModel'],
): string {
  return (
    options?.outputLanguage ||
    options?.expectedOutputs?.[0]?.language ||
    options?.expectedOutputs?.[0]?.languages?.[0] ||
    'en'
  );
}
