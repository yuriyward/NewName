import type { EnsureAiModelsOptions } from '../status-types';
import {
  ensureUserActivation,
  resolveLanguageDetectorCtor,
  throwIfAborted,
  wrapMonitor,
} from '../status-utils';
import { runWithAvailabilityWatchdog } from '../watchdog-manager';

export async function ensureLanguageDetectorReady(
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
