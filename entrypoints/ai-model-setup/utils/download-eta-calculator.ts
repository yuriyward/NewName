import { MODEL_ETA } from '../constants';
import {
  MAX_REASONABLE_ETA_SECONDS,
  MAX_SAMPLES,
  MIN_RATE_THRESHOLD,
  MIN_SAMPLES_FOR_DYNAMIC_ETA,
  SLOW_NETWORK_THRESHOLD,
} from './download-constants';

export interface ProgressSample {
  loaded: number;
  timestamp: number;
}

export interface CalculateETAInput {
  loaded: number;
  total: number;
  modelId: string;
  samples: ProgressSample[];
  startTime: number;
}

export interface CalculateETAResult {
  eta: string | null;
  elapsedTime: string | null;
  downloadRate: number | null;
  isSlowNetwork: boolean;
  shouldAddSample: boolean;
  newSamples?: ProgressSample[];
}

/**
 * Format elapsed time in a human-readable format
 */
export function formatElapsedTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)} sec`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return remainingSeconds > 0
    ? `${minutes} min ${remainingSeconds} sec`
    : `${minutes} min`;
}

/**
 * Format ETA as a human-readable string
 */
function formatETA(secondsRemaining: number): string {
  if (secondsRemaining < 60) {
    const seconds = Math.ceil(secondsRemaining);
    return `~${seconds} sec left`;
  }
  const minutes = Math.ceil(secondsRemaining / 60);
  return `~${minutes} min left`;
}

/**
 * Get static ETA fallback for a given model
 */
function getStaticETA(modelId: string): string | null {
  return MODEL_ETA[modelId as keyof typeof MODEL_ETA] || null;
}

/**
 * Calculate elapsed time since download started
 */
function calculateElapsedTime(startTime: number, now: number): string | null {
  const elapsedSeconds = (now - startTime) / 1000;
  return elapsedSeconds > 0 ? formatElapsedTime(elapsedSeconds) : null;
}

/**
 * Check if a new sample should be added to avoid duplicates
 */
function shouldAddProgressSample(
  samples: ProgressSample[],
  newLoaded: number,
): boolean {
  if (samples.length === 0) return true;
  const lastSample = samples[samples.length - 1];
  return lastSample.loaded !== newLoaded;
}

/**
 * Add a new sample and maintain the sliding window
 */
function addProgressSample(
  samples: ProgressSample[],
  newSample: ProgressSample,
): ProgressSample[] {
  const newSamples = [...samples, newSample];
  // Keep only recent samples
  if (newSamples.length > MAX_SAMPLES) {
    newSamples.shift();
  }
  return newSamples;
}

/**
 * Calculate download rate from samples
 */
function calculateDownloadRate(samples: ProgressSample[]): number | null {
  if (samples.length < MIN_SAMPLES_FOR_DYNAMIC_ETA) {
    return null;
  }

  const oldestSample = samples[0];
  const newestSample = samples[samples.length - 1];

  const bytesDownloaded = newestSample.loaded - oldestSample.loaded;
  const timeElapsed = (newestSample.timestamp - oldestSample.timestamp) / 1000; // seconds

  if (timeElapsed === 0) {
    return null;
  }

  return bytesDownloaded / timeElapsed; // bytes per second
}

/**
 * Calculate dynamic ETA based on download progress and rate.
 * Returns null if conditions don't allow for reliable calculation.
 */
export function calculateDynamicETA(
  loaded: number,
  total: number,
  rate: number,
): { secondsRemaining: number; formattedETA: string } | null {
  // Validate that we can calculate remaining time
  if (rate < MIN_RATE_THRESHOLD || loaded >= total) {
    return null;
  }

  const remaining = total - loaded;
  const secondsRemaining = remaining / rate;

  // Fall back if ETA is unrealistically large
  if (secondsRemaining > MAX_REASONABLE_ETA_SECONDS) {
    return null;
  }

  return {
    secondsRemaining,
    formattedETA: formatETA(secondsRemaining),
  };
}

/**
 * Pure calculation function for download ETA.
 * Separated from React hook for testability and reusability.
 *
 * Strategy:
 * - Collects progress samples with timestamps
 * - Calculates download rate using moving average
 * - Computes remaining time based on rate and bytes remaining
 * - Tracks elapsed time since download started
 * - Detects slow network conditions for improved UX messaging
 * - Falls back to static MODEL_ETA when calculation is unreliable
 * - Validates loaded < total to prevent negative ETA from API inconsistencies
 * - Validates ETA is reasonable (< 1 hour) to avoid displaying unrealistic values
 */
export function calculateDownloadETA(
  input: CalculateETAInput,
  now: number,
): CalculateETAResult {
  const { loaded, total, modelId, samples, startTime } = input;

  const elapsedTime = calculateElapsedTime(startTime, now);
  const staticEta = getStaticETA(modelId);

  // Need both loaded and total for calculation
  if (loaded === undefined || total === undefined || total === 0) {
    return {
      eta: staticEta,
      elapsedTime,
      downloadRate: null,
      isSlowNetwork: false,
      shouldAddSample: false,
    };
  }

  // Prevent negative ETA if loaded >= total (API inconsistencies or bugs)
  if (loaded >= total) {
    return {
      eta: staticEta,
      elapsedTime,
      downloadRate: null,
      isSlowNetwork: false,
      shouldAddSample: false,
    };
  }

  // Check if we should add this sample
  const shouldAdd = shouldAddProgressSample(samples, loaded);
  if (!shouldAdd) {
    // Return current state without adding duplicate sample
    return {
      eta: staticEta,
      elapsedTime,
      downloadRate: null,
      isSlowNetwork: false,
      shouldAddSample: false,
    };
  }

  // Add new sample
  const newSamples = addProgressSample(samples, { loaded, timestamp: now });

  // Need minimum samples for reliable calculation
  if (newSamples.length < MIN_SAMPLES_FOR_DYNAMIC_ETA) {
    return {
      eta: staticEta,
      elapsedTime,
      downloadRate: null,
      isSlowNetwork: false,
      shouldAddSample: true,
      newSamples,
    };
  }

  // Calculate average download rate
  const rate = calculateDownloadRate(newSamples);

  if (rate === null) {
    return {
      eta: staticEta,
      elapsedTime,
      downloadRate: null,
      isSlowNetwork: false,
      shouldAddSample: true,
      newSamples,
    };
  }

  // Check if network is slow
  const isSlowNetwork = rate > 0 && rate < SLOW_NETWORK_THRESHOLD;

  // Try to calculate dynamic ETA
  const dynamicETA = calculateDynamicETA(loaded, total, rate);

  if (dynamicETA === null) {
    // Fall back to static ETA
    return {
      eta: staticEta,
      elapsedTime,
      downloadRate: rate,
      isSlowNetwork,
      shouldAddSample: true,
      newSamples,
    };
  }

  // Return dynamic ETA
  return {
    eta: dynamicETA.formattedETA,
    elapsedTime,
    downloadRate: rate,
    isSlowNetwork,
    shouldAddSample: true,
    newSamples,
  };
}
