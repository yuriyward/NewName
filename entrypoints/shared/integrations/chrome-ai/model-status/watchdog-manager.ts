import { recordAiModelProcessingPhaseStart } from '../telemetry';
import { refreshAiModelStatus } from './status-probe';
import type {
  AiModelId,
  EnsureAiModelsOptions,
  RefreshAiModelOptions,
} from './status-types';

/**
 * Timeout configuration for AI model downloads and processing.
 * These are exported to allow testing and configuration overrides.
 */
export const DOWNLOAD_STALL_TIMEOUT_MS = 60_000; // 1 minute inactivity watchdog for Chrome model downloads
export const DOWNLOAD_OVERALL_TIMEOUT_MS = 30 * 60_000; // 30 minute hard cap for download phase (increased for slow networks)
export const PROCESSING_TIMEOUT_MS = 5 * 60_000; // 5 minute timeout for post-download processing phase

type AvailabilityProbeOptions = Pick<
  RefreshAiModelOptions,
  'languageModel' | 'summarizer'
>;

export async function runWithAvailabilityWatchdog(
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
