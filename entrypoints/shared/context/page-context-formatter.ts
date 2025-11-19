/**
 * Page context formatting utilities for AI prompts
 * Provides consistent formatting of page context (title, heading, URL) across all AI providers
 *
 * SECURITY: All inputs are sanitized to prevent prompt injection attacks.
 * Page context values (title, heading, URL) come from untrusted web pages.
 */

import type { PageContextDetails } from '@/entrypoints/shared/state/page-context-store';
import {
  sanitizeForPrompt,
  sanitizeUrl,
} from '@/entrypoints/shared/utils/prompt-sanitization';

/**
 * Format page context for inline display (single line with separators)
 * Example: "Page Title - First Heading - https://example.com"
 *
 * @param pageContext - Page context to format
 * @param separator - Separator between parts (default: ' - ')
 * @returns Formatted string or empty string if no context
 */
export function formatPageContextInline(
  pageContext: PageContextDetails | undefined,
  separator = ' - ',
): string {
  if (!pageContext) {
    return '';
  }

  const parts: string[] = [];
  // Sanitize all fields to prevent prompt injection
  if (pageContext.title) parts.push(sanitizeForPrompt(pageContext.title));
  if (pageContext.heading) parts.push(sanitizeForPrompt(pageContext.heading));
  if (pageContext.url) parts.push(sanitizeUrl(pageContext.url));

  return parts.length > 0 ? parts.join(separator) : '';
}

/**
 * Format page context for multiline display (each part on separate line)
 * Example:
 * ```
 * Page: "Page Title"
 * Heading: "First Heading"
 * URL: https://example.com
 * ```
 *
 * @param pageContext - Page context to format
 * @returns Formatted string or empty string if no context
 */
export function formatPageContextMultiline(
  pageContext: PageContextDetails | undefined,
): string {
  if (!pageContext) {
    return '';
  }

  const lines: string[] = [];
  // Sanitize all fields and properly escape quotes to prevent injection
  if (pageContext.title) {
    const sanitized = sanitizeForPrompt(pageContext.title);
    const escaped = sanitized.replace(/"/g, '\\"');
    lines.push(`Page: "${escaped}"`);
  }
  if (pageContext.heading) {
    const sanitized = sanitizeForPrompt(pageContext.heading);
    const escaped = sanitized.replace(/"/g, '\\"');
    lines.push(`Heading: "${escaped}"`);
  }
  if (pageContext.url) {
    lines.push(`URL: ${sanitizeUrl(pageContext.url)}`);
  }

  return lines.length > 0 ? lines.join('\n') : '';
}

/**
 * Format page context as a prompt snippet for AI models
 * Includes a prefix and uses the appropriate format based on context
 *
 * @param pageContext - Page context to format
 * @param options - Formatting options
 * @returns Formatted prompt snippet with prefix, or empty string if no context
 */
export function formatPageContextForPrompt(
  pageContext: PageContextDetails | undefined,
  options: {
    /**
     * Prefix to prepend before the context (can include newlines)
     * Default: '\nSource page:'
     */
    prefix?: string;
    /**
     * Use multiline format (each field on separate line)
     * Default: false (inline with separator)
     */
    multiline?: boolean;
    /**
     * Separator for inline format
     * Default: ' - '
     */
    separator?: string;
  } = {},
): string {
  if (!pageContext) {
    return '';
  }

  const {
    prefix = '\nSource page:',
    multiline = false,
    separator = ' - ',
  } = options;

  const formatted = multiline
    ? formatPageContextMultiline(pageContext)
    : formatPageContextInline(pageContext, separator);

  if (!formatted) {
    return '';
  }

  // If prefix already contains spacing/newlines, just append
  // Otherwise add a space between prefix and content
  const needsSpace = !prefix.endsWith(':') && !prefix.endsWith(' ');
  return multiline
    ? `${prefix}\n${formatted}`
    : `${prefix}${needsSpace ? ' ' : ''}${formatted}`;
}
