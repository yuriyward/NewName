import type { ChromeSummarizerOptions } from '../../types';
import type { EnsureAiModelsOptions } from '../status-types';
import {
  ensureUserActivation,
  resolveSummarizerCtor,
  resolveSummarizerInputLanguages,
  throwIfAborted,
  wrapMonitor,
} from '../status-utils';
import { runWithAvailabilityWatchdog } from '../watchdog-manager';

export async function ensureSummarizerReady(
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
