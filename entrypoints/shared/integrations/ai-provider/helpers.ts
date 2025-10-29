/**
 * Shared helpers for AI provider integrations
 */

/**
 * Smart JSON parser that handles both markdown-wrapped and raw JSON responses
 *
 * Gemini and other LLMs sometimes wrap JSON in markdown code blocks like:
 * ```json
 * { "key": "value" }
 * ```
 *
 * This parser automatically detects and unwraps markdown, then parses the JSON.
 *
 * @param text - Response text from AI model
 * @returns Parsed JSON object
 * @throws SyntaxError if the text is not valid JSON after unwrapping
 */
export function parseJsonResponse<T>(text: string): T {
  let cleaned = text.trim();

  // Check if wrapped in markdown code fence (```json ... ``` or ``` ... ```)
  const markdownMatch = cleaned.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
  if (markdownMatch) {
    cleaned = markdownMatch[1].trim();
  }

  return JSON.parse(cleaned);
}

/**
 * Date format instruction for AI filename generation
 * Consistent format used across all AI pipelines (text, image, PDF)
 */
export const DATE_FORMAT_RULE =
  'Format dates as YYYY-MM-DD (use dashes, not YYYYMMDD)';
