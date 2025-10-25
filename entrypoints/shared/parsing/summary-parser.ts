/**
 * Summary parser for AI-generated contextual upgrade summaries.
 * Handles structured and unstructured text formats from AI models.
 */

/**
 * Represents a parsed segment from a summary string
 */
export interface SummarySegment {
  /** Optional key for key-value segments (e.g., "Document Title", "Page 1") */
  key?: string;
  /** The content value of the segment */
  value: string;
}

/**
 * Maximum character position for a colon to be considered a key-value delimiter.
 * This prevents long sentences with colons from being incorrectly parsed as keys.
 * Example: "Note: This is a long sentence about something: with multiple colons"
 * would not be treated as a key-value pair.
 */
const MAX_KEY_LENGTH = 40;

/**
 * Checks if a trimmed line should be treated as a key-value pair.
 *
 * A line is considered a key-value pair if:
 * 1. It contains a colon (:)
 * 2. The colon appears after at least one character
 * 3. The colon appears within the first MAX_KEY_LENGTH characters
 *
 * @param line - The trimmed line to check
 * @returns True if the line should be parsed as key-value
 */
function isKeyValuePair(line: string): boolean {
  const colonIndex = line.indexOf(':');
  return colonIndex > 0 && colonIndex < MAX_KEY_LENGTH;
}

/**
 * Splits a key-value line into its key and value components.
 *
 * @param line - A trimmed line containing a colon delimiter
 * @returns A SummarySegment with both key and value
 */
function parseKeyValueLine(line: string): SummarySegment {
  const colonIndex = line.indexOf(':');
  const key = line.slice(0, colonIndex).trim();
  const value = line.slice(colonIndex + 1).trim();

  return { key, value };
}

/**
 * Splits the summary into individual lines and segments.
 *
 * Handles two delimiter types:
 * 1. Newlines (\n) - Primary delimiter for multi-line summaries
 * 2. Pipes (|) - Secondary delimiter for inline segments
 *
 * @param summary - The raw summary string
 * @returns Array of trimmed, non-empty segments
 */
function extractRawSegments(summary: string): string[] {
  return summary
    .split(/\n+/) // Split on one or more newlines
    .flatMap((line) => line.split(/\s*\|\s*/)) // Split each line on pipes
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

/**
 * Parse a summary string into structured segments with optional key-value pairs.
 *
 * This parser handles AI-generated summaries that may contain:
 * - Plain text segments
 * - Key-value pairs (e.g., "Document Title: Annual Report")
 * - Multi-line content separated by newlines
 * - Inline segments separated by pipes (|)
 *
 * @param summary - The summary string to parse
 * @returns Array of parsed segments with optional keys
 *
 * @example Plain text
 * parseSummary("This is a simple summary")
 * // Returns: [{ value: "This is a simple summary" }]
 *
 * @example Key-value pairs
 * parseSummary("Document Title: Annual Report\nAuthor: John Doe")
 * // Returns: [
 * //   { key: "Document Title", value: "Annual Report" },
 * //   { key: "Author", value: "John Doe" }
 * // ]
 *
 * @example Mixed content with pipes
 * parseSummary("Page 1: Introduction | Page 2: Methods | Page 3: Results")
 * // Returns: [
 * //   { key: "Page 1", value: "Introduction" },
 * //   { key: "Page 2", value: "Methods" },
 * //   { key: "Page 3", value: "Results" }
 * // ]
 */
export function parseSummary(summary: string): SummarySegment[] {
  const rawSegments = extractRawSegments(summary);
  const segments: SummarySegment[] = [];

  for (const segment of rawSegments) {
    if (isKeyValuePair(segment)) {
      segments.push(parseKeyValueLine(segment));
    } else {
      segments.push({ value: segment });
    }
  }

  return segments;
}
