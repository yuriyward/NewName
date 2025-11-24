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
export const DOWNLOAD_STALL_TIMEOUT_MS = 60_000; // 1 minute inactivity watchdog for active Chrome model downloads
export const DOWNLOAD_NEAR_COMPLETE_TIMEOUT_MS = 10 * 60_000; // 10 minute timeout for download completion transition (90%+ to processing)
export const DOWNLOAD_OVERALL_TIMEOUT_MS = 30 * 60_000; // 30 minute inactivity timeout for download phase (resets on each progress update)
export const DOWNLOAD_ZERO_PROGRESS_TIMEOUT_MS = 5 * 60_000; // 5 minute timeout when download never sends any progress events (stuck state)
export const PROCESSING_TIMEOUT_MS = 10 * 60_000; // 10 minute timeout for post-download processing phase (installation can be slow)

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

  let timer: ReturnType<typeof setTimeout> | null = null;
  const { signal } = options;

  let watchdogResolve: (() => void) | null = null;
  let watchdogReject: ((reason?: unknown) => void) | null = null;
  let downloadCompletedAt: number | null = null; // Track when download phase completes
  let lastUpdateTime = Date.now(); // Track last activity time for inactivity-based timeout
  let downloadStartTime: number | null = null; // Track when download phase started
  let hasSeenProgress = false; // Track if we've seen at least one progress update

  const armWatchdog = (isProgressUpdate = false): void => {
    if (timer) clearTimeout(timer);

    // Only reset last update time when there's actual progress (external kickWatchdog calls)
    // Do NOT reset during internal status polling, otherwise inactivity timeout never fires
    if (isProgressUpdate) {
      lastUpdateTime = Date.now();
      hasSeenProgress = true;
    }

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

        // Calculate inactivity time (time since last update)
        const inactivityTime = Date.now() - lastUpdateTime;

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

        // Track download start time
        if (stillDownloading && !downloadStartTime) {
          downloadStartTime = Date.now();
        }

        // Detect if we're in the "download complete, waiting for processing" phase
        // This happens when:
        // 1. Still in 'downloading' state (not yet 'processing')
        // 2. Download has been running for at least 2 minutes
        // 3. We've seen progress updates before (indicates download was active)
        const downloadDuration = downloadStartTime
          ? Date.now() - downloadStartTime
          : 0;
        const isNearComplete =
          stillDownloading &&
          !isProcessing &&
          downloadDuration > 2 * 60_000 && // Been downloading for 2+ minutes
          hasSeenProgress; // Have seen progress (not stuck from the start)

        // Use different timeouts based on phase:
        // 1. Processing phase: 10 min absolute timeout (installation can be slow)
        // 2. Zero-progress stuck downloads: 5 min timeout (never started sending progress)
        // 3. Near-complete phase (90%+ download waiting for Chrome): 10 min inactivity
        // 4. Active download phase: 30 min inactivity timeout
        const effectiveTimeout = downloadCompletedAt
          ? PROCESSING_TIMEOUT_MS // 10 minutes for processing
          : stillDownloading && !hasSeenProgress
            ? DOWNLOAD_ZERO_PROGRESS_TIMEOUT_MS // 5 minutes for stuck downloads
            : isNearComplete
              ? DOWNLOAD_NEAR_COMPLETE_TIMEOUT_MS // 10 minutes for near-complete transition
              : overallTimeoutMs; // 30 minutes inactivity for active download

        if (stillPending && inactivityTime < effectiveTimeout) {
          armWatchdog();
          return;
        }

        // Provide phase-specific error messages
        watchdogReject?.(
          new DOMException(
            downloadCompletedAt
              ? `Model processing for ${id} timed out. Chrome may still be extracting the model. Try refreshing the page or restarting Chrome.`
              : stillDownloading && !hasSeenProgress
                ? `Download for ${id} failed to start sending progress updates. Try canceling and clicking the button again, or refresh the page.`
                : isNearComplete
                  ? `Download for ${id} appears complete but Chrome hasn't started processing. Try clicking the button again or refresh the page.`
                  : `Download for ${id} stalled. Retry will restart the download from the beginning.`,
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
    // Mark as progress update when kicked - indicates download is actively progressing
    armWatchdog(true);
  };

  try {
    await Promise.race([action(kickWatchdog), abortPromise, watchdogPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
