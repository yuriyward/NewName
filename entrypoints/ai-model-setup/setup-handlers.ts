import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  AI_MODEL_IDS,
  type AiModelId,
  type AiModelProgressEvent,
  ensureAiModelsReady,
} from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import {
  clearAiModelSetupError,
  markAiModelSetupCompleted,
  recordAiModelSetupError,
} from '@/entrypoints/shared/integrations/chrome-ai/setup-state';
import {
  describeError,
  detectPreferredLanguage,
  isAbortError,
  isUserActivationIssue,
  resolveSupportedPromptLanguage,
} from './utils';

export async function startModelSetup(options: {
  modelId: AiModelId;
  signal: AbortSignal;
  onProgress: (event: AiModelProgressEvent) => void;
}): Promise<{
  allReady: boolean;
  result: Awaited<ReturnType<typeof ensureAiModelsReady>>;
}> {
  const { modelId, signal, onProgress } = options;
  const preferredLanguage = detectPreferredLanguage();
  const supportedOutputLanguage =
    resolveSupportedPromptLanguage(preferredLanguage);

  // Ask Chrome for a multimodal-capable language model during setup so we
  // fail fast when the "Prompt API for Gemini Nano (Multimodal Input)"
  // flag is left at "Default". Without the image descriptor here Chrome
  // reports the model as ready even though image inputs will be rejected
  // later in the pipeline.
  const languageModelOptions = {
    outputLanguage: supportedOutputLanguage,
    expectedInputs: [
      {
        type: 'text' as const,
        language: preferredLanguage,
        languages: [preferredLanguage],
      },
      { type: 'image' as const },
    ],
    expectedOutputs: [
      {
        type: 'text' as const,
        language: supportedOutputLanguage,
        languages: [supportedOutputLanguage],
      },
    ],
  };

  console.log('[AISetupPage] Calling ensureAiModelsReady with:', {
    modelId,
    preferredLanguage,
    supportedOutputLanguage,
    languageModelOptions,
  });

  const result = await ensureAiModelsReady({
    ids: [modelId],
    signal,
    onProgress,
    summarizer: {
      type: 'key-points',
      format: 'markdown',
      length: 'short',
      outputLanguage: supportedOutputLanguage,
      expectedInputLanguages: [preferredLanguage],
    },
    languageModel: languageModelOptions,
  });

  const allReady = AI_MODEL_IDS.every((id) => {
    const status = result[id];
    return status?.state === 'available' || status?.state === 'unsupported';
  });

  return { allReady, result };
}

export async function recordSetupCompletion(): Promise<number> {
  try {
    const recorded = await markAiModelSetupCompleted();
    return recorded.setupCompletedAt ?? Date.now();
  } catch (recordError) {
    debugLogger.warn('[AISetupPage] Failed to record setup completion', {
      error: recordError,
    });
    return Date.now();
  }
}

export async function handleSetupError(
  error: unknown,
): Promise<{ message: string; code?: string }> {
  const message = describeError(error);
  const code = error instanceof Error && error.name ? error.name : undefined;
  const userActivationIssue = isUserActivationIssue(error, message);

  if (userActivationIssue) {
    await clearAiModelSetupError();
  } else {
    try {
      await recordAiModelSetupError({ message, code });
    } catch (recordError) {
      debugLogger.warn('[AISetupPage] Failed to record setup error', {
        error: recordError,
      });
    }
  }

  return { message, code };
}

export { isAbortError };
