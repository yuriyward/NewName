/**
 * Utilities for normalising download paths and managed subfolder prefixes.
 */

export function normalizeDownloadPath(path: string | undefined): string {
  if (!path) {
    return '';
  }
  const forward = path.replace(/\\/g, '/');
  const withoutLeading = forward.replace(/^\/+/, '');
  return withoutLeading.replace(/\/{2,}/g, '/');
}

export function normalizeManagedPrefix(
  prefix: string | null | undefined,
): string | null {
  if (!prefix) {
    return null;
  }
  const normalized = normalizeDownloadPath(prefix).trim();
  const withoutTrailingSlash = normalized.replace(/\/+$/, '');
  const withoutTrailingDots = withoutTrailingSlash.replace(/\.+$/, '');
  return withoutTrailingDots.length > 0 ? withoutTrailingDots : null;
}

export function buildManagedPath(prefix: string, relative: string): string {
  const cleanPrefix = prefix.replace(/\/+$/, '');
  const cleanRelative = relative.replace(/^\/+/, '');
  if (!cleanPrefix) {
    return cleanRelative;
  }
  if (!cleanRelative) {
    return cleanPrefix;
  }
  return `${cleanPrefix}/${cleanRelative}`;
}
