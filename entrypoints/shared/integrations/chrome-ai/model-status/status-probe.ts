import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { ensureCacheLoaded, persistStatusForId } from './status-cache';
import type {
  AiModelId,
  AiModelStatus,
  RefreshAiModelOptions,
} from './status-types';
import {
  buildStatus,
  deriveErrorCode,
  deriveErrorMessage,
  normaliseAvailability,
  resolveExpectedInputs,
  resolveExpectedOutputs,
  resolveLanguageDetectorCtor,
  resolveLanguageModelCtor,
  resolveOutputLanguage,
  resolveSummarizerCtor,
  resolveSummarizerInputLanguages,
} from './status-utils';

const pendingProbes = new Map<AiModelId, Promise<AiModelStatus>>();

export async function refreshAiModelStatus(
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

export async function probeModel(
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

    const outputLanguage = resolveOutputLanguage(options);
    const expectedInputs = resolveExpectedInputs(
      options?.expectedInputs,
      outputLanguage,
    );
    const expectedOutputs = resolveExpectedOutputs(
      options?.expectedOutputs,
      outputLanguage,
    );

    if (typeof ctor.availability === 'function') {
      availability = await ctor.availability({
        outputLanguage,
        expectedInputs,
        expectedOutputs,
      });
    } else if (typeof ctor.capabilities === 'function') {
      const capabilities = await ctor.capabilities({
        outputLanguage,
        expectedInputs,
        expectedOutputs,
      });
      availability = capabilities?.available;
      reason = capabilities?.reason;
    }

    const normalised = normaliseAvailability(availability);
    return normalised.state === 'unknown'
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
    const outputLanguage = options?.outputLanguage || 'en';
    const expectedInputLanguages = resolveSummarizerInputLanguages(
      options?.expectedInputLanguages,
      outputLanguage,
    );

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

  // Retry logic to handle API initialization race condition
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 100;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Defensive type checking to ensure API is ready
      if (typeof ctor.availability !== 'function') {
        if (attempt < MAX_RETRIES - 1) {
          debugLogger.log(
            '[AIModels] Language detector availability not ready, retrying...',
            {
              attempt: attempt + 1,
              availabilityType: typeof ctor.availability,
            },
          );
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)),
          );
          continue;
        }
        return buildStatus('language-detector', 'unknown', {
          detail: 'LanguageDetector.availability() not ready',
          errorCode: 'NotReady',
        });
      }

      const availability = await ctor.availability();
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
      const isTransient = error == null;
      if (attempt < MAX_RETRIES - 1) {
        debugLogger.log(
          '[AIModels] Language detector check failed, retrying...',
          {
            attempt: attempt + 1,
            error,
          },
        );
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)),
        );
        continue;
      }

      if (isTransient) {
        debugLogger.log(
          '[AIModels] Language detector availability returned no error payload; treating as transient',
          { attempts: MAX_RETRIES },
        );
        return buildStatus('language-detector', 'unknown', {
          detail:
            'Chrome is still starting the Language Detector. Retry in a few seconds.',
          errorCode: 'InitializationPending',
        });
      }

      debugLogger.warn(
        '[AIModels] Language detector availability failed after retries',
        {
          error,
          errorType: typeof error,
          errorConstructor: error?.constructor?.name,
          attempts: MAX_RETRIES,
        },
      );

      // Better error handling for non-Error rejections
      const errorMessage =
        error instanceof Error
          ? deriveErrorMessage(error)
          : `Availability check failed: ${String(error)}`;
      const errorCode =
        error instanceof Error ? deriveErrorCode(error) : 'InitializationError';

      return buildStatus('language-detector', 'error', {
        detail: errorMessage,
        errorCode: errorCode || 'UnknownError',
      });
    }
  }

  // Fallback (should never reach here due to loop logic)
  return buildStatus('language-detector', 'unknown', {
    detail: 'Unexpected state after retry loop',
    errorCode: 'UnexpectedState',
  });
}
