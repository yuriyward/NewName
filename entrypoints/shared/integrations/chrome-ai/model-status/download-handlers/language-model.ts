import type { ChromeLanguageModelCreateOptions } from '../../types';
import type { EnsureAiModelsOptions } from '../status-types';
import {
  ensureUserActivation,
  resolveExpectedInputs,
  resolveExpectedOutputs,
  resolveLanguageModelCtor,
  resolveOutputLanguage,
  throwIfAborted,
  wrapMonitor,
} from '../status-utils';
import { runWithAvailabilityWatchdog } from '../watchdog-manager';

export async function ensureLanguageModelReady(
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
