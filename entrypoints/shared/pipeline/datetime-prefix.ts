/**
 * Datetime prefix utilities for AI Rename + date strategy
 *
 * Handles extraction and application of datetime prefixes in format:
 * YYYY-MM-DD_HH-MM
 *
 * Examples:
 * - "2025-11-18_14-30-report.pdf"
 * - "2025-11-18_14-30_report.pdf"
 * - "2025-11-18_14-30 report.pdf"
 */

/**
 * Regular expression pattern for datetime prefix: YYYY-MM-DD_HH-MM
 * Matches the start of a filename with this exact format
 */
const DATETIME_PREFIX_PATTERN = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}/;

/**
 * Extract datetime prefix from a filename if present
 *
 * @param filename - The filename to extract from (with or without extension)
 * @returns The datetime prefix (e.g., "2025-11-18_14-30") or null if not found
 *
 * @example
 * extractDateTimePrefix("2025-11-18_14-30-report.pdf")
 * // Returns: "2025-11-18_14-30"
 *
 * @example
 * extractDateTimePrefix("report.pdf")
 * // Returns: null
 */
export function extractDateTimePrefix(filename: string): string | null {
  const match = filename.match(DATETIME_PREFIX_PATTERN);
  return match ? match[0] : null;
}

/**
 * Apply datetime prefix to a filename with the specified separator
 *
 * @param filename - The filename to prefix (with or without extension)
 * @param datetime - The datetime string in format YYYY-MM-DD_HH-MM
 * @param separator - The separator character to use between datetime and filename (' ', '-', or '_')
 * @returns The prefixed filename
 *
 * @example
 * applyDateTimePrefix("report.pdf", "2025-11-18_14-30", "-")
 * // Returns: "2025-11-18_14-30-report.pdf"
 *
 * @example
 * applyDateTimePrefix("Annual Report.pdf", "2025-11-18_14-30", " ")
 * // Returns: "2025-11-18_14-30 Annual Report.pdf"
 */
export function applyDateTimePrefix(
  filename: string,
  datetime: string,
  separator: string,
): string {
  return `${datetime}${separator}${filename}`;
}

/**
 * Remove datetime prefix from a filename if present
 *
 * @param filename - The filename to remove prefix from
 * @returns Object with the datetime prefix and remaining filename
 *
 * @example
 * removeDateTimePrefix("2025-11-18_14-30-report.pdf")
 * // Returns: { datetime: "2025-11-18_14-30", filename: "report.pdf", separator: "-" }
 *
 * @example
 * removeDateTimePrefix("report.pdf")
 * // Returns: { datetime: null, filename: "report.pdf", separator: null }
 */
export function removeDateTimePrefix(filename: string): {
  datetime: string | null;
  filename: string;
  separator: string | null;
} {
  const datetime = extractDateTimePrefix(filename);
  if (!datetime) {
    return { datetime: null, filename, separator: null };
  }

  // Remove the datetime prefix (16 characters: "YYYY-MM-DD_HH-MM")
  const remaining = filename.slice(datetime.length);

  // Detect the separator (first character after datetime)
  const separator = remaining.length > 0 ? remaining.charAt(0) : null;

  // Remove the separator and return the filename
  const cleanFilename =
    separator && [' ', '-', '_'].includes(separator)
      ? remaining.slice(1)
      : remaining;

  return { datetime, filename: cleanFilename, separator };
}

/**
 * Check if a filename has a datetime prefix
 *
 * @param filename - The filename to check
 * @returns true if filename starts with datetime prefix
 *
 * @example
 * hasDateTimePrefix("2025-11-18_14-30-report.pdf")
 * // Returns: true
 *
 * @example
 * hasDateTimePrefix("report.pdf")
 * // Returns: false
 */
export function hasDateTimePrefix(filename: string): boolean {
  return DATETIME_PREFIX_PATTERN.test(filename);
}
