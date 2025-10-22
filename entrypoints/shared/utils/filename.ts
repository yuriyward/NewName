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
 * Extract the file extension from a filename, handling multi-part extensions.
 * Returns the extension in lowercase without the leading dot, or null if no extension found.
 *
 * @param name - The filename or path to extract the extension from
 * @returns The extension in lowercase, or null if no valid extension exists
 *
 * @example
 * extractExtension('file.txt') // 'txt'
 * extractExtension('archive.tar.gz') // 'gz'
 * extractExtension('/path/to/file.PDF') // 'pdf'
 * extractExtension('no-extension') // null
 * extractExtension('.hidden') // null
 */
export function extractExtension(name: string | undefined): string | null {
  if (!name) return null;
  const base = basename(name);
  const dotIndex = base.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === base.length - 1) {
    return null;
  }
  return base.slice(dotIndex + 1).toLowerCase();
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

/**
 * Truncate a filename in the middle while preserving the extension.
 *
 * Example:
 * truncateFilenameMiddle('very-long-filename.pdf', 20) // "very-lo...lename.pdf"
 *
 * @param filename - The filename to truncate.
 * @param maxLength - Maximum length before truncation is applied.
 */
export function truncateFilenameMiddle(
  filename: string,
  maxLength = 50,
): string {
  if (filename.length <= maxLength) return filename;

  const lastDotIndex = filename.lastIndexOf('.');
  const ext = lastDotIndex > 0 ? filename.slice(lastDotIndex) : '';
  const nameWithoutExt =
    lastDotIndex > 0 ? filename.slice(0, lastDotIndex) : filename;

  const ellipsis = '...';
  const availableChars = maxLength - ellipsis.length - ext.length;
  const startChars = Math.ceil(availableChars / 2);
  const endChars = Math.floor(availableChars / 2);

  const start = nameWithoutExt.slice(0, startChars);
  const end = nameWithoutExt.slice(-endChars);

  return `${start}${ellipsis}${end}${ext}`;
}
