/**
 * Text analysis constants for language detection and summarization.
 * These values define thresholds and limits for AI processing.
 */

/**
 * Maximum character length for language detection sample.
 * The Chrome Language Detector API accepts this many characters.
 */
export const LANGUAGE_DETECTION_SAMPLE_SIZE = 5_000;

/**
 * Maximum character length for summarization input.
 * The Chrome Summarizer API works best with this character limit.
 */
export const SUMMARIZATION_SAMPLE_SIZE = 20_000;

/**
 * Character limit for summary preview logging.
 * Shows first N characters of text in debug logs.
 */
export const PREVIEW_LOG_LENGTH = 100;
