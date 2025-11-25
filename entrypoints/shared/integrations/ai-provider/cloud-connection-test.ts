/**
 * Cloud AI Connection Testing
 *
 * Provides lightweight API key validation for Google Gemini.
 * Uses minimal token count (~3-5 tokens) to verify API key validity,
 * model access, and network connectivity.
 *
 * Cost per test: ~$0.00000013 with gemini-flash-lite-latest
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { CloudModel } from '@/entrypoints/shared/settings/types';

export interface CloudConnectionTestResult {
  success: boolean;
  error?: string;
}

/**
 * Tests cloud AI connection with minimal token usage.
 *
 * Sends a simple echo prompt to verify:
 * - API key is valid
 * - Model is accessible
 * - Network connectivity works
 * - No quota/rate limit issues
 *
 * @param apiKey - Decrypted Google API key
 * @param model - Gemini model identifier to test
 * @returns Test result with success flag and optional error message
 *
 * @example
 * ```ts
 * const result = await testCloudConnection(apiKey, 'gemini-flash-lite-latest');
 * if (result.success) {
 *   console.log('Connection successful!');
 * } else {
 *   console.error('Connection failed:', result.error);
 * }
 * ```
 */
export async function testCloudConnection(
  apiKey: string,
  model: CloudModel,
): Promise<CloudConnectionTestResult> {
  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const modelInstance = google(model);

    const result = await generateText({
      model: modelInstance,
      prompt: 'Reply with exactly: OK',
      temperature: 0,
    });

    const response = result.text.trim().toUpperCase();

    // Accept "OK" with optional trailing punctuation (e.g., "OK.", "OK!")
    if (/^OK[.!?]?$/.test(response)) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Unexpected response from API',
    };
  } catch (error) {
    return { success: false, error: parseCloudApiError(error) };
  }
}

/**
 * Error pattern definitions for cloud API error parsing.
 * Each entry maps known error patterns to user-friendly messages.
 * Patterns are checked case-insensitively against the error message.
 */
const ERROR_PATTERNS: ReadonlyArray<{
  patterns: readonly string[];
  message: string;
}> = [
  // API key errors
  {
    patterns: ['API_KEY_INVALID', 'API key not valid'],
    message: 'Invalid API key',
  },
  // Permission errors
  {
    patterns: ['PERMISSION_DENIED', 'permission'],
    message: 'API key lacks required permissions',
  },
  // Quota/rate limit errors
  {
    patterns: ['QUOTA', 'quota', 'RATE_LIMIT', 'rate limit'],
    message: 'API quota exceeded or rate limited',
  },
  // Model not found
  {
    patterns: ['MODEL_NOT_FOUND', 'not found'],
    message: 'Model not available for this API key',
  },
  // Network errors
  {
    patterns: ['fetch', 'network', 'ECONNREFUSED'],
    message: 'Network connection failed',
  },
];

/**
 * Parses cloud API errors into user-friendly messages.
 *
 * Maps known error patterns from the Google AI SDK to descriptive messages.
 * Falls back to the original error message if no pattern matches.
 *
 * @param error - The caught error from the API call
 * @returns User-friendly error message
 */
function parseCloudApiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  for (const { patterns, message: errorMessage } of ERROR_PATTERNS) {
    if (patterns.some((p) => message.includes(p))) {
      return errorMessage;
    }
  }

  return message || 'Connection test failed';
}
