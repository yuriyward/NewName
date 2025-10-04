/**
 * Centralized constants for MediaInfo integration and analysis pipeline.
 */

/**
 * Timeout Constants
 */

/**
 * Maximum time to wait for media analysis to complete in the sandbox.
 * This covers the entire analysis process including WASM initialization,
 * streaming fetch, and MediaInfo processing.
 */
export const ANALYSIS_TIMEOUT_MS = 30_000;

/**
 * Maximum time to wait for sandbox iframe to send ready signal.
 * Includes time for iframe creation, script loading, and WASM initialization.
 */
export const SANDBOX_READY_TIMEOUT_MS = 5_000;

/**
 * Maximum time to wait for media analysis before suggesting filename.
 * Set slightly higher than ANALYSIS_TIMEOUT_MS to allow for cleanup.
 * Used in background download interception to avoid blocking downloads.
 */
export const MEDIA_ANALYSIS_MAX_WAIT_MS = 1_800;

/**
 * Total timeout for filename suggestion in download interception.
 * Includes MEDIA_ANALYSIS_MAX_WAIT_MS plus buffer for processing.
 */
export const SUGGEST_TIMEOUT_MS = MEDIA_ANALYSIS_MAX_WAIT_MS + 400;

/**
 * Retry Configuration for Offscreen Document Handshake
 */

/**
 * Maximum number of retry attempts for offscreen document handshake.
 * Handshake ensures the offscreen document and sandbox are fully initialized.
 */
export const OFFSCREEN_HANDSHAKE_MAX_RETRIES = 3;

/**
 * Base backoff delay in milliseconds for offscreen handshake retries.
 * Actual delay is calculated as: OFFSCREEN_HANDSHAKE_BACKOFF_MS * 2^attempt
 */
export const OFFSCREEN_HANDSHAKE_BACKOFF_MS = 20;
