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

    // Accept any response containing "OK" - model might add punctuation
    if (response === 'OK' || response.includes('OK')) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Unexpected response from API',
    };
  } catch (error) {
    // Parse common error types for user-friendly messages
    const errorMessage = error instanceof Error ? error.message : String(error);

    // API key errors
    if (
      errorMessage.includes('API_KEY_INVALID') ||
      errorMessage.includes('API key not valid')
    ) {
      return { success: false, error: 'Invalid API key' };
    }

    // Permission errors
    if (
      errorMessage.includes('PERMISSION_DENIED') ||
      errorMessage.includes('permission')
    ) {
      return {
        success: false,
        error: 'API key lacks required permissions',
      };
    }

    // Quota/rate limit errors
    if (
      errorMessage.includes('QUOTA') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('RATE_LIMIT') ||
      errorMessage.includes('rate limit')
    ) {
      return { success: false, error: 'API quota exceeded or rate limited' };
    }

    // Model not found
    if (
      errorMessage.includes('MODEL_NOT_FOUND') ||
      errorMessage.includes('not found')
    ) {
      return { success: false, error: 'Model not available for this API key' };
    }

    // Network errors
    if (
      errorMessage.includes('fetch') ||
      errorMessage.includes('network') ||
      errorMessage.includes('ECONNREFUSED')
    ) {
      return { success: false, error: 'Network connection failed' };
    }

    // Generic error fallback
    return {
      success: false,
      error: errorMessage || 'Connection test failed',
    };
  }
}
