/**
 * Shared constants for download ETA calculation and progress display.
 * These thresholds control when to show dynamic vs. static ETA estimates
 * and when to detect slow network conditions.
 */

/**
 * Minimum number of progress samples required before calculating dynamic ETA.
 * Below this threshold, we fall back to static MODEL_ETA estimates.
 */
export const MIN_SAMPLES_FOR_DYNAMIC_ETA = 3;

/**
 * Maximum number of progress samples to keep in the moving average window.
 * Older samples are discarded to keep calculations focused on recent download rate.
 */
export const MAX_SAMPLES = 5;

/**
 * Bytes per megabyte constant for rate calculations.
 */
export const BYTES_PER_MB = 1024 * 1024;

/**
 * Minimum download rate threshold (bytes per second) for reliable ETA calculation.
 * Below this rate (10 KB/s), we fall back to static estimates due to unstable connection.
 */
export const MIN_RATE_THRESHOLD = 0.01 * BYTES_PER_MB; // 10 KB/s

/**
 * Slow network threshold (bytes per second).
 * Download rates below 100 KB/s trigger slow network warnings in the UI.
 */
export const SLOW_NETWORK_THRESHOLD = 100 * 1024; // 100 KB/s

/**
 * Maximum reasonable ETA in seconds (1 hour).
 * If calculated ETA exceeds this, we fall back to static estimates
 * to avoid displaying unrealistic time estimates.
 */
export const MAX_REASONABLE_ETA_SECONDS = 3600; // 1 hour

/**
 * Progress percentage threshold for detecting post-download processing phase.
 * When progress reaches 90% without ETA info, we assume Chrome is finalizing the download.
 */
export const PROCESSING_THRESHOLD_PERCENT = 90;
