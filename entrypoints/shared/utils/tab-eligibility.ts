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
 *
 * Returns false for:
 * - null/undefined/non-string values (defensive default for unknown contexts)
 * - Restricted URLs like chrome://, about:, extension pages, addon stores, etc.
 *
 * A URL must be a valid, non-empty string that doesn't match any restricted
 * patterns to be considered eligible for content script injection.
 *
 * @param url - The URL to check (can be null/undefined for tabs without URLs)
 * @returns true if content scripts can be safely injected, false otherwise
 */
export function isUrlEligibleForContentScript(
  url: string | null | undefined,
): boolean {
  if (!url || typeof url !== 'string') {
    // Defensive default: null, undefined, or non-string URLs are restricted
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
 * A tab is only considered eligible if:
 * 1. It has a valid tab ID
 * 2. It has either a visible URL or pendingUrl
 * 3. The URL is not restricted (chrome://, about:, etc.)
 *
 * Tabs without accessible URLs are treated as restricted for safety—
 * they may be system tabs, restricted contexts, or have permission issues.
 * Attempting content script injection on such tabs would fail silently.
 *
 * @param tab - The Chrome tab object to check
 * @returns true if the tab can safely receive toast messages, false otherwise
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
    // Defensive default: treat tabs without accessible URLs as restricted.
    // This prevents attempting content script injection on:
    // - System tabs (chrome://, about:, etc.) that don't expose their URL
    // - Tabs where the extension lacks permission to see the URL
    // - Edge cases where both url and pendingUrl are undefined
    return false;
  }

  return isUrlEligibleForContentScript(candidateUrl);
}
