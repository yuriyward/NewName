/**
 * Page context formatting utilities for AI prompts
 * Provides consistent formatting of page context (title, heading, URL) across all AI providers
 */

import type { PageContext } from '@/entrypoints/shared/state/page-context-store';

/**
 * Format page context for inline display (single line with separators)
 * Example: "Page Title - First Heading - https://example.com"
 *
 * @param pageContext - Page context to format
 * @param separator - Separator between parts (default: ' - ')
 * @returns Formatted string or empty string if no context
 */
export function formatPageContextInline(
  pageContext: Pick<PageContext, 'title' | 'heading' | 'url'> | undefined,
  separator = ' - ',
): string {
  if (!pageContext) {
    return '';
  }

  const parts: string[] = [];
  if (pageContext.title) parts.push(pageContext.title);
  if (pageContext.heading) parts.push(pageContext.heading);
  if (pageContext.url) parts.push(pageContext.url);

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
  pageContext: Pick<PageContext, 'title' | 'heading' | 'url'> | undefined,
): string {
  if (!pageContext) {
    return '';
  }

  const lines: string[] = [];
  if (pageContext.title) lines.push(`Page: "${pageContext.title}"`);
  if (pageContext.heading) lines.push(`Heading: "${pageContext.heading}"`);
  if (pageContext.url) lines.push(`URL: ${pageContext.url}`);

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
  pageContext: Pick<PageContext, 'title' | 'heading' | 'url'> | undefined,
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
    : `${prefix}${needsSpace ? ' ' : ' '}${formatted}`;
}
