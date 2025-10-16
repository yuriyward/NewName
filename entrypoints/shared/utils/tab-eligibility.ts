/**
 * Utility helpers for checking tab eligibility for content script injection.
 */

/**
 * URL protocols and patterns where content scripts cannot be injected.
 * These are Chrome/browser-restricted pages where extensions have no access.
 */
const RESTRICTED_URL_PATTERNS = [
  /^chrome:\/\//i,
  /^edge:\/\//i,
  /^about:/i,
  /^chrome-extension:\/\//i,
  /^edge-extension:\/\//i,
  /^moz-extension:\/\//i,
  /^safari-extension:\/\//i,
  /^view-source:/i,
  /^data:/i,
  /^javascript:/i,
  // Chrome Web Store
  /^https?:\/\/chrome\.google\.com\/webstore/i,
  /^https?:\/\/chromewebstore\.google\.com/i,
  // Edge Add-ons
  /^https?:\/\/microsoftedge\.microsoft\.com\/addons/i,
  // Firefox Add-ons
  /^https?:\/\/addons\.mozilla\.org/i,
] as const;

/**
 * Check if a URL is eligible for content script injection.
 * Returns false for restricted URLs like chrome://, about:, extension pages, etc.
 *
 * @param url - The URL to check (can be null/undefined for tabs without URLs)
 * @returns true if content scripts can be injected, false otherwise
 */
export function isUrlEligibleForContentScript(
  url: string | null | undefined,
): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Check against all restricted patterns
  for (const pattern of RESTRICTED_URL_PATTERNS) {
    if (pattern.test(url)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a Chrome tabs.Tab object is eligible for toast injection.
 * Checks both URL eligibility and tab validity.
 *
 * @param tab - The Chrome tab object to check
 * @returns true if the tab can receive toast messages, false otherwise
 */
export function isTabEligibleForToast(
  tab:
    | {
        id?: number;
        url?: string | null;
        pendingUrl?: string | null;
      }
    | null
    | undefined,
): boolean {
  if (!tab || typeof tab.id !== 'number') {
    return false;
  }

  const candidateUrl =
    typeof tab.url === 'string'
      ? tab.url
      : typeof tab.pendingUrl === 'string'
        ? tab.pendingUrl
        : undefined;

  if (!candidateUrl) {
    // Treat tabs without a visible URL (due to permissions) as eligible.
    return true;
  }

  return isUrlEligibleForContentScript(candidateUrl);
}
