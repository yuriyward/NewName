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
 * Offscreen Document Initialization
 */

/**
 * Delay in milliseconds after DOMContentLoaded before announcing offscreen readiness.
 * Ensures message system and dynamic import infrastructure are fully initialized.
 * Increased from 50ms to 200ms to prevent race conditions on fast sites (e.g., x-kom.pl).
 */
export const OFFSCREEN_INIT_DELAY_MS = 200;

/**
 * Maximum number of retry attempts for dynamic imports in offscreen context.
 * Handles race conditions where offscreen document is initialized but dynamic import system isn't ready.
 */
export const OFFSCREEN_DYNAMIC_IMPORT_MAX_RETRIES = 3;

/**
 * Retry delays in milliseconds for dynamic import attempts with exponential backoff.
 * Used when dynamic imports fail in offscreen context (common on fast sites like x-kom.pl).
 * Array indices correspond to attempt number: [attempt 0, attempt 1, attempt 2]
 */
export const OFFSCREEN_DYNAMIC_IMPORT_RETRY_DELAYS = [100, 200, 400] as const;

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

/**
 * File Size Limits
 */

/**
 * Maximum size in bytes for full file downloads when range requests are not supported.
 * Set to 100MB - safe for audio files, prevents accidental large downloads.
 * Used in range fetcher fallback when server responds with 200 OK instead of 206 Partial Content.
 */
export const MAX_FULL_DOWNLOAD_SIZE = 100 * 1024 * 1024; // 100MB in bytes
