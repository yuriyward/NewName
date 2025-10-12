import {
  decodeTextBuffer,
  type TextEncoding,
} from '@/entrypoints/shared/utils/encoding';

export interface NormalizeTextBufferOptions {
  /**
   * Maximum number of UTF-16 code units to retain.
   * Defaults to 50k to avoid overwhelming downstream AI APIs.
   */
  maxLength?: number;
  /**
   * Collapse consecutive whitespace characters (excluding newlines) into a single space.
   * Defaults to true.
   */
  collapseWhitespace?: boolean;
  /**
   * Normalize `\r\n` and `\r` line endings to `\n`.
   * Defaults to true.
   */
  normalizeNewlines?: boolean;
  /**
   * Whether to remove leading Markdown fences and HTML tags.
   * Defaults to true.
   */
  stripLightweightMarkup?: boolean;
}

export interface NormalizeTextBufferResult {
  text: string;
  originalLength: number;
  truncated: boolean;
  encoding: TextEncoding;
}

const DEFAULT_MAX_LENGTH = 50_000;

function stripHtmlTags(value: string): string {
  if (!value.includes('<')) return value;
  return value.replace(/<[^>]+>/g, '');
}

function stripMarkdownFences(value: string): string {
  return value.replace(
    /```([\w-]+)?\s*[\r\n]+([\s\S]*?)```/g,
    (_, _lang, body) => body ?? '',
  );
}

function collapseWhitespaceSegments(value: string): string {
  return value.replace(/[ \t\f\v]+/g, ' ');
}

function sanitizeControlChars(value: string): string {
  if (value.length === 0) {
    return value;
  }
  const builder: string[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const char = value.charAt(i);
    const code = value.charCodeAt(i);
    if (
      (code >= 0 && code <= 8) ||
      code === 11 ||
      code === 12 ||
      (code >= 14 && code <= 31) ||
      code === 127
    ) {
      continue;
    }
    builder.push(char);
  }
  return builder.length === value.length ? value : builder.join('');
}

export function normalizeTextBuffer(
  buffer: Uint8Array,
  options: NormalizeTextBufferOptions = {},
): NormalizeTextBufferResult {
  const {
    maxLength = DEFAULT_MAX_LENGTH,
    collapseWhitespace = true,
    normalizeNewlines = true,
    stripLightweightMarkup = true,
  } = options;

  const decoded = decodeTextBuffer(buffer);
  let text = decoded.text;

  if (normalizeNewlines) {
    text = text.replace(/\r\n?/g, '\n');
  }

  text = sanitizeControlChars(text);
  text = text.replace(/\u200b|\ufeff/g, '');

  if (stripLightweightMarkup) {
    text = stripMarkdownFences(text);
    // Strip simple HTML markup but keep contents.
    text = stripHtmlTags(text);
  }

  if (collapseWhitespace) {
    text = collapseWhitespaceSegments(text);
    // Collapse multiple blank lines to a maximum of two in a row.
    text = text.replace(/\n{3,}/g, '\n\n');
  }

  const trimmed = text.trim();
  const truncated = trimmed.length > maxLength;
  const finalText = truncated ? trimmed.slice(0, maxLength).trimEnd() : trimmed;

  return {
    text: finalText,
    originalLength: trimmed.length,
    truncated,
    encoding: decoded.encoding,
  };
}
