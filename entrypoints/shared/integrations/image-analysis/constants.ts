/**
 * Centralized constants for image analysis integration and pipeline
 */

/**
 * Maximum longest edge dimension in pixels for downscaled images sent to Prompt API
 * Per Chrome Prompt API multimodal limits and token efficiency
 */
export const MAX_IMAGE_EDGE_PX = 384;

/**
 * Minimum dimensions to consider valid image
 */
export const MIN_IMAGE_DIMENSION_PX = 16;

/**
 * Maximum file size to attempt loading as image (before downscaling)
 */
export const MAX_IMAGE_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Target MIME type for all image analysis (PNG for safety and token efficiency)
 */
export const IMAGE_ANALYSIS_FORMAT = 'image/png';

/**
 * Maximum description length before warning
 */
export const MAX_DESCRIPTION_LENGTH_CHARS = 120;

/**
 * Confidence thresholds for image rename decision
 */
export const HIGH_CONFIDENCE_AUTO_APPLY_THRESHOLD = 0.9;
export const HIGH_CONFIDENCE_DISPLAY_THRESHOLD = 0.8;
