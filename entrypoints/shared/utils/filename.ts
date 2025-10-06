/**
 * Utility helpers for working with file names.
 */

/**
 * Extract the base filename from a path, normalising Windows separators.
 */
export function basename(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts.pop() ?? path;
}

/**
 * Generate a fallback filename from a URL when no filename is provided.
 */
export function fallbackNameFromUrl(
  rawUrl: string,
  defaultName = 'download',
): string {
  try {
    const url = new URL(rawUrl);
    const segment = url.pathname.split('/').pop() ?? defaultName;
    if (!segment) return defaultName;
    try {
      const decoded = decodeURIComponent(segment);
      return decoded || defaultName;
    } catch {
      return segment;
    }
  } catch {
    return defaultName;
  }
}
