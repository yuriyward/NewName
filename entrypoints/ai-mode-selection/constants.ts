/**
 * Constants for AI mode selection page
 */

import type { PageContextConsent } from '@/entrypoints/shared/settings/types';

// ============================================================================
// Error Messages
// ============================================================================

/**
 * Error message displayed when system RAM detection fails
 */
export const ERROR_SYSTEM_SPECS_DETECTION =
  'Could not detect system specifications. Please try again.';

/**
 * Error message displayed when saving the user's AI choice fails
 */
export const ERROR_SAVE_CHOICE =
  'Failed to save your choice. Please try again.';

// ============================================================================
// Hardware Thresholds
// ============================================================================

/**
 * Minimum RAM in gigabytes recommended for local AI processing
 * Systems with less RAM may experience performance issues with Gemini Nano
 */
export const RAM_THRESHOLD_GB = 16;

// ============================================================================
// Page Context Consent Factories
// ============================================================================

/**
 * Creates a PageContextConsent object representing granted consent
 * Used when user explicitly agrees to page context capture
 *
 * @returns PageContextConsent with consentGranted: true and current timestamp
 */
export function createGrantedConsent(): PageContextConsent {
  return {
    consentGranted: true,
    consentTimestamp: Date.now(),
  };
}

/**
 * Creates a PageContextConsent object representing declined consent
 * Used when user explicitly declines page context capture
 *
 * @returns PageContextConsent with consentGranted: false and null timestamp
 */
export function createDeclinedConsent(): PageContextConsent {
  return {
    consentGranted: false,
    consentTimestamp: null,
  };
}
