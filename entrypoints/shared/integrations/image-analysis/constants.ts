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
 * Minimum downscale ratio to prevent excessive image degradation
 * Even if an image is very large, we won't scale it down more than this ratio
 * This ensures image quality is preserved for analysis
 */
export const MIN_DOWNSCALE_RATIO = 0.1;

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

/**
 * User-friendly instructions for enabling multimodal AI support
 * Note: The flag MUST be set to "Enabled", not "Default" - these are different states.
 */
export const MULTIMODAL_SETUP_INSTRUCTIONS = `Chrome's multimodal AI (image analysis) is not enabled yet.

⚠️  IMPORTANT: Flag must be set to "Enabled" (NOT "Default")
"Default" state does NOT enable multimodal support.

To enable multimodal AI:
1. Open chrome://flags in a new tab
2. Search for "prompt-api-for-gemini-nano-multimodal-input"
3. Click the dropdown menu and select "Enabled"
   (Make sure it says "Enabled", not "Default")
4. Click "Relaunch" to restart Chrome
5. Wait for Gemini Nano to download (check chrome://components)

Requirements:
- Chrome 138+ (Canary/Dev channel)
- 22GB+ available storage

Troubleshooting:
- Ensure you selected "Enabled" in the dropdown (not "Default")
- Check chrome://components for "Optimization Guide On Device Model"
- Restart Chrome completely after changing the flag
- If still unavailable, you may need Early Preview Program enrollment`;

/**
 * Error message when session creation fails despite availability check passing
 * Usually indicates the Chrome flag is set to "Default" instead of "Enabled"
 */
export function buildSessionCreationFailureMessage(): string {
  return (
    `Image analysis failed: multimodal session creation did not work.\n\n` +
    `This often happens when the Chrome flag is set to "Default" instead of "Enabled".\n\n` +
    MULTIMODAL_SETUP_INSTRUCTIONS
  );
}
